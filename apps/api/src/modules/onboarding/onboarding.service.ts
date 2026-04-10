import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { StorageGateway } from '../integrations/storage.gateway.js';
import { CvParserGateway } from '../integrations/cv-parser.gateway.js';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly storageGateway: StorageGateway,
    private readonly cvParserGateway: CvParserGateway,
  ) {}

  async basic(token: string, fullName: string, phone: string) {
    const candidate = await prisma.candidate.findUnique({ where: { token } });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    await prisma.candidateProfile.upsert({
      where: { candidateId: candidate.id },
      update: { fullName, phone },
      create: { candidateId: candidate.id, fullName, phone },
    });
    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      data: { basicCompleted: true },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: candidate.id,
        action: 'onboarding.basic_completed',
        entityType: 'Candidate',
        entityId: candidate.id,
        metadata: { organizationId: candidate.organizationId } as never,
      },
    });

    this.logger.log(JSON.stringify({ event: 'onboarding_basic_completed', candidateId: candidate.id }));

    return { ok: true };
  }

  async consent(token: string) {
    const candidate = await prisma.candidate.findUnique({ where: { token } });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    const session = await prisma.candidateOnboardingSession.findUnique({
      where: { candidateId: candidate.id },
    });
    if (!session) throw new NotFoundException('onboarding_session_not_found');

    await prisma.candidateConsent.createMany({
      data: [
        { sessionId: session.id, type: 'lgpd', accepted: true },
        { sessionId: session.id, type: 'terms', accepted: true },
      ],
    });
    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      data: { consentCompleted: true },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: candidate.id,
        action: 'onboarding.consent_completed',
        entityType: 'Candidate',
        entityId: candidate.id,
        metadata: { organizationId: candidate.organizationId } as never,
      },
    });

    this.logger.log(JSON.stringify({ event: 'onboarding_consent_completed', candidateId: candidate.id }));

    return { ok: true };
  }

  async resume(token: string, filename: string) {
    const candidate = await prisma.candidate.findUnique({ where: { token } });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    const session = await prisma.candidateOnboardingSession.findUnique({
      where: { candidateId: candidate.id },
    });
    if (!session) throw new NotFoundException('onboarding_session_not_found');

    const upload = await this.storageGateway.createPresignedUpload({
      tenantId: candidate.organizationId,
      namespace: `candidate-cv/${candidate.id}`,
      filename,
      metadata: { source: 'candidate-onboarding' },
    });

    const resume = await prisma.candidateResume.create({
      data: { sessionId: session.id, objectKey: upload.objectKey, provider: upload.provider },
    });

    await this.storageGateway.recordAsset({
      tenantId: candidate.organizationId,
      objectKey: upload.objectKey,
      category: 'resume-cv',
      provider: upload.provider,
      metadata: { candidateId: candidate.id, sessionId: session.id },
    });

    const parsed = await this.cvParserGateway.parseResume({
      resumeId: resume.id,
      objectKey: resume.objectKey,
      candidateId: candidate.id,
    });

    await prisma.resumeParseResult.upsert({
      where: { resumeId: resume.id },
      update: { status: 'parsed', parsedJson: parsed as never },
      create: { resumeId: resume.id, status: 'parsed', parsedJson: parsed as never },
    });

    await prisma.outboxEvent.create({ data: { topic: 'resume.uploaded', payload: { resumeId: resume.id } } });
    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      data: { resumeCompleted: true, status: 'completed' },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: candidate.id,
        action: 'onboarding.resume_completed',
        entityType: 'Candidate',
        entityId: candidate.id,
        metadata: { organizationId: candidate.organizationId, resumeId: resume.id } as never,
      },
    });

    this.logger.log(JSON.stringify({ event: 'onboarding_resume_completed', candidateId: candidate.id, resumeId: resume.id }));

    return { ...resume, upload };
  }
}

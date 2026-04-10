import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { StorageGateway } from '../integrations/storage.gateway.js';
import { CvParserGateway } from '../integrations/cv-parser.gateway.js';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly storageGateway: StorageGateway,
    private readonly cvParserGateway: CvParserGateway,
  ) {}

  async basic(token: string, fullName: string, phone: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
    await prisma.candidateProfile.upsert({
      where: { candidateId: candidate.id },
      update: { fullName, phone },
      create: { candidateId: candidate.id, fullName, phone },
    });
    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      data: { basicCompleted: true },
    });
    return { ok: true };
  }

  async consent(token: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
    const session = await prisma.candidateOnboardingSession.findUniqueOrThrow({
      where: { candidateId: candidate.id },
    });
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
    return { ok: true };
  }

  async resume(token: string, filename: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
    const session = await prisma.candidateOnboardingSession.findUniqueOrThrow({
      where: { candidateId: candidate.id },
    });

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
    return { ...resume, upload };
  }
}

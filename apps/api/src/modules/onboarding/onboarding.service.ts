import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { StorageGateway } from '../integrations/storage.gateway.js';
import { CvParserGateway } from '../integrations/cv-parser.gateway.js';
import { NotificationDispatchService } from '../notification-preferences/notification-dispatch.service.js';
import { extractResumeTextFromBuffer } from './resume-text-extractor.js';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @Inject(StorageGateway) private readonly storageGateway: StorageGateway,
    @Inject(CvParserGateway) private readonly cvParserGateway: CvParserGateway,
    @Inject(NotificationDispatchService) private readonly notificationDispatchService: NotificationDispatchService,
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
    await this.notifyInviter(candidate.organizationId, candidate.invitedByUserId, candidate.id, 'basic');

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
    await this.notifyInviter(candidate.organizationId, candidate.invitedByUserId, candidate.id, 'consent');

    return { ok: true };
  }

  async createResumeUpload(token: string, filename: string, contentType?: string) {
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
      contentType,
      metadata: { source: 'candidate-onboarding' },
    });

    const resume = await prisma.candidateResume.create({
      data: { sessionId: session.id, objectKey: upload.objectKey, provider: upload.provider, status: 'pending_upload' },
    });

    await this.storageGateway.recordAsset({
      tenantId: candidate.organizationId,
      objectKey: upload.objectKey,
      category: 'resume-cv',
      provider: upload.provider,
      metadata: { candidateId: candidate.id, sessionId: session.id, filename, status: 'pending_upload' },
    });

    this.logger.log(JSON.stringify({ event: 'onboarding_resume_upload_created', candidateId: candidate.id, resumeId: resume.id }));

    return { ...resume, upload };
  }

  async completeResume(token: string, resumeId: string, filename: string) {
    const candidate = await prisma.candidate.findUnique({ where: { token } });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    const resume = await prisma.candidateResume.findFirst({
      where: {
        id: resumeId,
        session: { candidateId: candidate.id },
      },
      include: {
        session: true,
      },
    });
    if (!resume) throw new NotFoundException('resume_not_found');

    const objectBuffer = await this.storageGateway.getObjectBuffer(resume.objectKey);
    const resumeText = await extractResumeTextFromBuffer(filename, objectBuffer);

    const parsed = await this.cvParserGateway.parseResume({
      resumeId: resume.id,
      objectKey: resume.objectKey,
      candidateId: candidate.id,
      resumeText,
    });

    await prisma.resumeParseResult.upsert({
      where: { resumeId: resume.id },
      update: { status: 'parsed', parsedJson: parsed as never },
      create: { resumeId: resume.id, status: 'parsed', parsedJson: parsed as never },
    });

    await prisma.candidateResume.update({
      where: { id: resume.id },
      data: { status: 'parsed' },
    });

    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      // Mark as 'completed' here since preferences and intro-video are optional
      data: { resumeCompleted: true, status: 'completed' },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: candidate.id,
        action: 'onboarding.resume_completed',
        entityType: 'Candidate',
        entityId: candidate.id,
        metadata: { organizationId: candidate.organizationId, resumeId: resume.id, objectKey: resume.objectKey } as never,
      },
    });

    this.logger.log(JSON.stringify({ event: 'onboarding_resume_completed', candidateId: candidate.id, resumeId: resume.id }));
    await this.notifyInviter(candidate.organizationId, candidate.invitedByUserId, candidate.id, 'resume');

    return {
      ok: true,
      resumeId: resume.id,
      objectKey: resume.objectKey,
      provider: resume.provider,
      parsed,
    };
  }

  async preferences(
    token: string,
    data: { salaryMin?: number; salaryMax?: number; jobTitles?: string[]; languages?: string[] },
  ) {
    const candidate = await prisma.candidate.findUnique({ where: { token } });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    await prisma.candidatePreferences.upsert({
      where: { candidateId: candidate.id },
      update: {
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        jobTitles: data.jobTitles ?? [],
        languages: data.languages ?? [],
      },
      create: {
        candidateId: candidate.id,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        jobTitles: data.jobTitles ?? [],
        languages: data.languages ?? [],
      },
    });

    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      data: { preferencesCompleted: true },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: candidate.id,
        action: 'onboarding.preferences_completed',
        entityType: 'Candidate',
        entityId: candidate.id,
        metadata: { organizationId: candidate.organizationId } as never,
      },
    });

    this.logger.log(JSON.stringify({ event: 'onboarding_preferences_completed', candidateId: candidate.id }));

    return { ok: true };
  }

  async createIntroVideoUpload(token: string, filename: string, contentType?: string) {
    const candidate = await prisma.candidate.findUnique({ where: { token } });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    const upload = await this.storageGateway.createPresignedUpload({
      tenantId: candidate.organizationId,
      namespace: `candidate-intro-video/${candidate.id}`,
      filename,
      contentType,
      metadata: { source: 'candidate-intro-video', candidateId: candidate.id },
    });

    this.logger.log(JSON.stringify({ event: 'onboarding_intro_video_upload_created', candidateId: candidate.id }));

    return { objectKey: upload.objectKey, provider: upload.provider, upload };
  }

  async completeIntroVideo(token: string, objectKey: string, provider: string, durationSec: number) {
    const candidate = await prisma.candidate.findUnique({ where: { token } });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    await prisma.candidateProfile.upsert({
      where: { candidateId: candidate.id },
      update: {
        introVideoKey: objectKey,
        introVideoProvider: provider,
        introVideoDurationSec: durationSec,
        introVideoUploadedAt: new Date(),
      },
      create: {
        candidateId: candidate.id,
        introVideoKey: objectKey,
        introVideoProvider: provider,
        introVideoDurationSec: durationSec,
        introVideoUploadedAt: new Date(),
      },
    });

    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      data: { introVideoCompleted: true, status: 'completed' },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: candidate.id,
        action: 'onboarding.intro_video_completed',
        entityType: 'Candidate',
        entityId: candidate.id,
        metadata: { organizationId: candidate.organizationId, objectKey, provider, durationSec } as never,
      },
    });

    this.logger.log(JSON.stringify({ event: 'onboarding_intro_video_completed', candidateId: candidate.id }));

    return { ok: true };
  }

  async getParsedResume(token: string) {
    const candidate = await prisma.candidate.findUnique({ where: { token } });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    const session = await prisma.candidateOnboardingSession.findUnique({
      where: { candidateId: candidate.id },
      include: {
        resumes: {
          include: {
            parseResult: true,
            parseMetadata: true,
          },
          orderBy: { uploadedAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!session) throw new NotFoundException('onboarding_session_not_found');

    const resume = session.resumes[0];
    if (!resume?.parseResult) {
      return { status: 'pending', parsedData: null };
    }

    return {
      status: resume.parseResult.status,
      parsedData: resume.parseResult.parsedJson,
      confidence: resume.parseMetadata?.confidenceJson ?? null,
      provider: resume.parseMetadata?.provider ?? null,
    };
  }

  async getStatus(token: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { token },
      include: {
        profile: true,
        onboarding: true,
        applications: {
          include: {
            vacancy: { select: { id: true, title: true } },
            shortlistItems: {
              include: {
                decisions: { select: { decision: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
              },
            },
            smartInterviewSessions: { select: { id: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    const steps: Array<{ key: string; label: string; completed: boolean; current: boolean }> = [];
    const onboarding = candidate.onboarding;
    const app = candidate.applications[0];

    const basicDone = !!onboarding?.basicCompleted;
    const consentDone = !!onboarding?.consentCompleted;
    const resumeDone = !!onboarding?.resumeCompleted;
    const preferencesDone = !!onboarding?.preferencesCompleted;
    const introVideoDone = !!onboarding?.introVideoCompleted;

    // Only expose candidate-facing onboarding steps — internal selection steps are hidden
    steps.push({ key: 'basic', label: 'Dados básicos', completed: basicDone, current: !basicDone });
    steps.push({ key: 'consent', label: 'Consentimento LGPD', completed: consentDone, current: basicDone && !consentDone });
    steps.push({ key: 'resume', label: 'Envio de currículo', completed: resumeDone, current: consentDone && !resumeDone });
    steps.push({ key: 'preferences', label: 'Preferências profissionais', completed: preferencesDone, current: resumeDone && !preferencesDone });
    steps.push({ key: 'intro-video', label: 'Vídeo de apresentação', completed: introVideoDone, current: preferencesDone && !introVideoDone });

    const interview = app?.smartInterviewSessions?.[0];
    const latestDecision = app?.shortlistItems?.[0]?.decisions?.[0];

    return {
      candidateId: candidate.id,
      fullName: candidate.profile?.fullName ?? null,
      email: candidate.email,
      vacancy: app ? { id: app.vacancy.id, title: app.vacancy.title } : null,
      onboardingStatus: onboarding?.status ?? 'not_started',
      steps,
      interview: interview ? { id: interview.id, status: interview.status } : null,
      decision: latestDecision ? { decision: latestDecision.decision, at: latestDecision.createdAt } : null,
    };
  }

  private async notifyInviter(organizationId: string, invitedByUserId: string | null, candidateId: string, step: string) {
    if (!invitedByUserId) return;
    await this.notificationDispatchService.dispatchToUsers({
      organizationId,
      userIds: [invitedByUserId],
      eventKey: 'candidate.step-completed',
      metadata: { candidateId, step },
    });
  }
}

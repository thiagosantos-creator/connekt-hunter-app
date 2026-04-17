import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { StorageGateway } from '../integrations/storage.gateway.js';
import { CvParserGateway } from '../integrations/cv-parser.gateway.js';
import { NotificationDispatchService } from '../notification-preferences/notification-dispatch.service.js';
import { extractResumeTextFromBuffer } from './resume-text-extractor.js';

/** Fallback label used when structured resume fields are missing */
const NOT_INFORMED = 'Não informado';

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
      data: { resumeCompleted: true, status: 'pending' },
    });

    // Sync parsed CV data to structured profile models
    await this.syncParsedResumeToProfile(candidate.id, parsed);

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
    data: { salaryMin?: number; salaryMax?: number; jobTitles?: string[]; languages?: string[]; workModelPreference?: string[] },
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
        workModelPreference: data.workModelPreference ?? [],
      },
      create: {
        candidateId: candidate.id,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        jobTitles: data.jobTitles ?? [],
        languages: data.languages ?? [],
        workModelPreference: data.workModelPreference ?? [],
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
        introVideoAnalysisStatus: 'queued',
        introVideoTranscript: null,
        introVideoTranscriptLanguage: null,
        introVideoSummary: null,
        introVideoTags: null as never,
        introVideoSentimentJson: null as never,
        introVideoEntitiesJson: null as never,
        introVideoKeyPhrasesJson: null as never,
        introVideoAnalyzedAt: null,
      },
      create: {
        candidateId: candidate.id,
        introVideoKey: objectKey,
        introVideoProvider: provider,
        introVideoDurationSec: durationSec,
        introVideoUploadedAt: new Date(),
        introVideoAnalysisStatus: 'queued',
      },
    });

    await this.storageGateway.recordAsset({
      tenantId: candidate.organizationId,
      objectKey,
      category: 'candidate-intro-video',
      provider,
      metadata: { candidateId: candidate.id, durationSec, source: 'candidate-onboarding' },
    });

    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      data: { introVideoCompleted: true, status: 'completed' },
    });

    await prisma.outboxEvent.create({
      data: {
        topic: 'candidate.intro-video-uploaded',
        payload: { candidateId: candidate.id, organizationId: candidate.organizationId, objectKey, provider } as never,
      },
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
        preferences: true,
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
      preferences: candidate.preferences ? {
        salaryMin: candidate.preferences.salaryMin,
        salaryMax: candidate.preferences.salaryMax,
        jobTitles: candidate.preferences.jobTitles,
        languages: candidate.preferences.languages,
        workModelPreference: candidate.preferences.workModelPreference,
      } : null,
      steps,
      introVideo: candidate.profile?.introVideoKey ? {
        uploadedAt: candidate.profile.introVideoUploadedAt ?? null,
        durationSec: candidate.profile.introVideoDurationSec ?? null,
        analysisStatus: candidate.profile.introVideoAnalysisStatus ?? 'queued',
        summary: candidate.profile.introVideoSummary ?? null,
        transcript: candidate.profile.introVideoTranscript ?? null,
        transcriptLanguage: candidate.profile.introVideoTranscriptLanguage ?? null,
        tags: Array.isArray(candidate.profile.introVideoTags) ? candidate.profile.introVideoTags : [],
        sentiment: candidate.profile.introVideoSentimentJson ?? null,
        entities: candidate.profile.introVideoEntitiesJson ?? null,
        keyPhrases: candidate.profile.introVideoKeyPhrasesJson ?? null,
        analyzedAt: candidate.profile.introVideoAnalyzedAt ?? null,
        playbackUrl: await this.getPresignedPlaybackUrl(candidate.profile.introVideoKey),
      } : null,
      interview: interview ? { id: interview.id, status: interview.status } : null,
      // Decision details (approve/reject/hold) are internal and MUST NOT be exposed to candidates.
      // Candidates see only a generic "em análise" status via the onboarding steps.
      decision: null,
    };
  }

  async getIntroVideoPlaybackUrl(token: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { token },
      include: { profile: { select: { introVideoKey: true } } },
    });
    if (!candidate) throw new NotFoundException('candidate_not_found');
    if (!candidate.profile?.introVideoKey) throw new NotFoundException('intro_video_not_found');
    const url = await this.getPresignedPlaybackUrl(candidate.profile.introVideoKey);
    return { url };
  }

  private async getPresignedPlaybackUrl(objectKey: string): Promise<string> {
    return this.storageGateway.createPresignedDownload(objectKey);
  }

  /**
   * Syncs parsed resume data (experience, education, skills, languages)
   * into structured CandidateProfile relations so that downstream AI services
   * can access normalized candidate data.
   */
  async syncParsedResumeToProfile(candidateId: string, parsed: unknown) {
    const data = parsed as {
      summary?: string;
      experience?: Array<{ company?: string; role?: string; period?: string; description?: string }>;
      education?: Array<{ institution?: string; degree?: string; field?: string; period?: string }>;
      skills?: Array<string | { name?: string; level?: string }>;
      languages?: Array<string | { name?: string; level?: string }>;
      location?: { city?: string; state?: string; country?: string };
    } | null;

    if (!data) return;

    const profile = await prisma.candidateProfile.findUnique({ where: { candidateId } });
    if (!profile) return;

    // Update profile summary and location fields (only if currently empty)
    const profileUpdates: Record<string, string> = {};
    if (data.summary && !profile.resumeSummary) profileUpdates.resumeSummary = data.summary;
    if (data.location?.city && !profile.locationCity) profileUpdates.locationCity = data.location.city;
    if (data.location?.state && !profile.locationState) profileUpdates.locationState = data.location.state;
    if (data.location?.country && !profile.locationCountry) profileUpdates.locationCountry = data.location.country;

    if (Object.keys(profileUpdates).length > 0) {
      await prisma.candidateProfile.update({
        where: { candidateId },
        data: profileUpdates,
      });
    }

    // Clear existing cv-parse sourced records before re-syncing
    await Promise.all([
      prisma.candidateExperience.deleteMany({ where: { profileId: profile.id, source: 'cv-parse' } }),
      prisma.candidateEducation.deleteMany({ where: { profileId: profile.id, source: 'cv-parse' } }),
      prisma.candidateSkill.deleteMany({ where: { profileId: profile.id, source: 'cv-parse' } }),
      prisma.candidateLanguage.deleteMany({ where: { profileId: profile.id, source: 'cv-parse' } }),
    ]);

    // Sync experiences
    if (Array.isArray(data.experience) && data.experience.length > 0) {
      await prisma.candidateExperience.createMany({
        data: data.experience
          .filter((exp) => exp.company || exp.role)
          .map((exp) => ({
            profileId: profile.id,
            company: exp.company ?? NOT_INFORMED,
            role: exp.role ?? NOT_INFORMED,
            period: exp.period ?? null,
            description: exp.description ?? null,
            source: 'cv-parse',
          })),
      });
    }

    // Sync education
    if (Array.isArray(data.education) && data.education.length > 0) {
      await prisma.candidateEducation.createMany({
        data: data.education
          .filter((edu) => edu.institution || edu.degree)
          .map((edu) => ({
            profileId: profile.id,
            institution: edu.institution ?? NOT_INFORMED,
            degree: edu.degree ?? NOT_INFORMED,
            field: edu.field ?? null,
            period: edu.period ?? null,
            source: 'cv-parse',
          })),
      });
    }

    // Sync skills (deduplicated)
    if (Array.isArray(data.skills) && data.skills.length > 0) {
      const seen = new Set<string>();
      const skillRecords = data.skills
        .map((skill) => {
          const name = (typeof skill === 'string' ? skill : skill?.name ?? '').trim();
          const level = typeof skill === 'object' ? skill?.level ?? null : null;
          return { name, level };
        })
        .filter((s) => s.name && !seen.has(s.name.toLowerCase()) && (seen.add(s.name.toLowerCase()), true));

      if (skillRecords.length > 0) {
        await prisma.candidateSkill.createMany({
          data: skillRecords.map((s) => ({
            profileId: profile.id,
            name: s.name,
            level: s.level,
            source: 'cv-parse',
          })),
          skipDuplicates: true,
        });
      }
    }

    // Sync languages (deduplicated)
    if (Array.isArray(data.languages) && data.languages.length > 0) {
      const seen = new Set<string>();
      const langRecords = data.languages
        .map((lang) => {
          const name = (typeof lang === 'string' ? lang : lang?.name ?? '').trim();
          const level = typeof lang === 'object' ? lang?.level ?? null : null;
          return { name, level };
        })
        .filter((l) => l.name && !seen.has(l.name.toLowerCase()) && (seen.add(l.name.toLowerCase()), true));

      if (langRecords.length > 0) {
        await prisma.candidateLanguage.createMany({
          data: langRecords.map((l) => ({
            profileId: profile.id,
            name: l.name,
            level: l.level,
            source: 'cv-parse',
          })),
          skipDuplicates: true,
        });
      }
    }

    this.logger.log(JSON.stringify({ event: 'resume_profile_synced', candidateId, profileId: profile.id }));
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

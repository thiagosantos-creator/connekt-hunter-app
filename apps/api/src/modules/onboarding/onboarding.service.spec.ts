import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    candidate: {
      findUnique: vi.fn(),
    },
    candidateProfile: {
      upsert: vi.fn().mockResolvedValue({ id: 'cp1' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'cp1', candidateId: 'c1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    candidateOnboardingSession: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ id: 'os1' }),
    },
    candidateConsent: {
      createMany: vi.fn().mockResolvedValue({}),
    },
    candidateResume: {
      create: vi.fn().mockResolvedValue({ id: 'cr1', objectKey: 'key1', provider: 'aws-s3', status: 'pending_upload' }),
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    resumeParseResult: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    candidatePreferences: {
      upsert: vi.fn().mockResolvedValue({ id: 'pref1' }),
    },
    candidateExperience: {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    },
    candidateEducation: {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    },
    candidateSkill: {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    },
    candidateLanguage: {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    storedAsset: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

const mockStorageGateway = {
  createPresignedUpload: vi.fn().mockResolvedValue({
    objectKey: 'key1',
    url: 'http://local/upload',
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    provider: 'aws-s3',
  }),
  recordAsset: vi.fn().mockResolvedValue({}),
  getObjectBuffer: vi.fn().mockResolvedValue(Buffer.from('Experienced engineer with TypeScript background', 'utf-8')),
};

const mockCvParserGateway = {
  parseResume: vi.fn().mockResolvedValue({ summary: 'parsed resume' }),
};

const mockNotificationDispatchService = {
  dispatchToUsers: vi.fn().mockResolvedValue([]),
};

import { OnboardingService } from './onboarding.service.js';
import { prisma } from '@connekt/db';

describe('OnboardingService', () => {
  const service = new OnboardingService(mockStorageGateway as never, mockCvParserGateway as never, mockNotificationDispatchService as never);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.candidateOnboardingSession.findUnique).mockResolvedValue({ id: 'os1' } as never);
    vi.mocked(prisma.candidateResume.create).mockResolvedValue({ id: 'cr1', objectKey: 'key1', provider: 'aws-s3', status: 'pending_upload' } as never);
    vi.mocked(prisma.candidateResume.update).mockResolvedValue({} as never);
    mockStorageGateway.createPresignedUpload.mockResolvedValue({
      objectKey: 'key1',
      url: 'http://local/upload',
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      provider: 'aws-s3',
    });
    mockStorageGateway.getObjectBuffer.mockResolvedValue(Buffer.from('Experienced engineer with TypeScript background', 'utf-8'));
    mockCvParserGateway.parseResume.mockResolvedValue({ summary: 'parsed resume' });
  });

  it('should throw NotFoundException when candidate token is invalid for basic', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue(null);
    await expect(service.basic('invalid-token', 'John', '123')).rejects.toThrow('candidate_not_found');
  });

  it('should complete basic onboarding and create audit event', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: 'c1',
      organizationId: 'org1',
      token: 'valid-token',
    } as never);

    const result = await service.basic('valid-token', 'John', '123');
    expect(result).toEqual({ ok: true });
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'onboarding.basic_completed' }) }),
    );
  });

  it('should throw NotFoundException when candidate token is invalid for consent', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue(null);
    await expect(service.consent('invalid-token')).rejects.toThrow('candidate_not_found');
  });

  it('should complete consent and create audit event', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: 'c1',
      organizationId: 'org1',
      token: 'valid-token',
    } as never);
    vi.mocked(prisma.candidateOnboardingSession.findUnique).mockResolvedValue({ id: 'os1' } as never);

    const result = await service.consent('valid-token');
    expect(result).toEqual({ ok: true });
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'onboarding.consent_completed' }) }),
    );
  });

  it('creates a resume upload instead of marking onboarding complete immediately', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: 'c1',
      organizationId: 'org1',
      token: 'valid-token',
    } as never);
    vi.mocked(prisma.candidateOnboardingSession.findUnique).mockResolvedValue({ id: 'os1' } as never);

    const result = await service.createResumeUpload('valid-token', 'cv.txt', 'text/plain');

    expect(result).toEqual(expect.objectContaining({
      id: 'cr1',
      objectKey: 'key1',
      upload: expect.objectContaining({ url: 'http://local/upload' }),
    }));
    expect(prisma.candidateOnboardingSession.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ resumeCompleted: true }) }),
    );
  });

  it('completes resume processing after the object exists in storage', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: 'c1',
      organizationId: 'org1',
      token: 'valid-token',
      invitedByUserId: 'u1',
    } as never);
    vi.mocked(prisma.candidateResume.findFirst).mockResolvedValue({
      id: 'cr1',
      objectKey: 'key1',
      provider: 'aws-s3',
      session: { id: 'os1', candidateId: 'c1' },
    } as never);

    const result = await service.completeResume('valid-token', 'cr1', 'cv.txt');

    expect(mockStorageGateway.getObjectBuffer).toHaveBeenCalledWith('key1');
    expect(mockCvParserGateway.parseResume).toHaveBeenCalledWith(expect.objectContaining({
      resumeId: 'cr1',
      candidateId: 'c1',
      resumeText: expect.stringContaining('Experienced engineer'),
    }));
    expect(result).toEqual(expect.objectContaining({ ok: true, resumeId: 'cr1' }));
    expect(prisma.candidateOnboardingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ resumeCompleted: true, status: 'pending' }) }),
    );
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'onboarding.resume_completed' }) }),
    );
  });

  it('should throw NotFoundException when candidate token is invalid for preferences', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue(null);
    await expect(service.preferences('invalid-token', {})).rejects.toThrow('candidate_not_found');
  });

  it('should save preferences and create audit event', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: 'c1',
      organizationId: 'org1',
      token: 'valid-token',
    } as never);

    const result = await service.preferences('valid-token', {
      salaryMin: 5000,
      salaryMax: 10000,
      jobTitles: ['Software Engineer', 'Tech Lead'],
      languages: ['Português', 'Inglês'],
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.candidatePreferences.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { candidateId: 'c1' },
    }));
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'onboarding.preferences_completed' }) }),
    );
  });

  it('should throw NotFoundException when candidate token is invalid for intro video presign', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue(null);
    await expect(service.createIntroVideoUpload('invalid-token', 'video.webm')).rejects.toThrow('candidate_not_found');
  });

  it('should create intro video presigned upload', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: 'c1',
      organizationId: 'org1',
      token: 'valid-token',
    } as never);

    const result = await service.createIntroVideoUpload('valid-token', 'intro.webm', 'video/webm');

    expect(mockStorageGateway.createPresignedUpload).toHaveBeenCalledWith(expect.objectContaining({
      namespace: 'candidate-intro-video/c1',
    }));
    expect(result).toEqual(expect.objectContaining({ objectKey: 'key1', provider: 'aws-s3' }));
  });

  it('should complete intro video and mark onboarding completed', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: 'c1',
      organizationId: 'org1',
      token: 'valid-token',
    } as never);

    const result = await service.completeIntroVideo('valid-token', 'intro-key', 'aws-s3', 90);

    expect(result).toEqual({ ok: true });
    expect(prisma.candidateProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ introVideoKey: 'intro-key', introVideoDurationSec: 90 }),
    }));
    expect(prisma.candidateOnboardingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ introVideoCompleted: true, status: 'completed' }) }),
    );
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'onboarding.intro_video_completed' }) }),
    );
  });

  it('getStatus should not expose internal selection steps', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: 'c1',
      organizationId: 'org1',
      email: 'c@test.com',
      profile: { fullName: 'John' },
      onboarding: {
        basicCompleted: true,
        consentCompleted: true,
        resumeCompleted: true,
        preferencesCompleted: false,
        introVideoCompleted: false,
        status: 'pending',
      },
      applications: [],
    } as never);

    const status = await service.getStatus('valid-token');

    const stepKeys = status.steps.map((s: { key: string }) => s.key);
    expect(stepKeys).not.toContain('review');
    expect(stepKeys).not.toContain('shortlisted');
    expect(stepKeys).not.toContain('decision');
    expect(stepKeys).toContain('preferences');
    expect(stepKeys).toContain('intro-video');
  });
});

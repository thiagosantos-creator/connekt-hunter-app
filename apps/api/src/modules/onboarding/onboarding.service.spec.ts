import { describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    candidate: {
      findUnique: vi.fn(),
    },
    candidateProfile: {
      upsert: vi.fn().mockResolvedValue({ id: 'cp1' }),
    },
    candidateOnboardingSession: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ id: 'os1' }),
    },
    candidateConsent: {
      createMany: vi.fn().mockResolvedValue({}),
    },
    candidateResume: {
      create: vi.fn().mockResolvedValue({ id: 'cr1', objectKey: 'key1', provider: 'local' }),
    },
    resumeParseResult: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

const mockStorageGateway = {
  createPresignedUpload: vi.fn().mockResolvedValue({ objectKey: 'key1', uploadUrl: 'http://local/upload', provider: 'local' }),
  recordAsset: vi.fn().mockResolvedValue({}),
};

const mockCvParserGateway = {
  parseResume: vi.fn().mockResolvedValue({ summary: 'parsed resume' }),
};

import { OnboardingService } from './onboarding.service.js';
import { prisma } from '@connekt/db';

describe('OnboardingService', () => {
  const service = new OnboardingService(mockStorageGateway as never, mockCvParserGateway as never);

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

  it('should throw NotFoundException when candidate token is invalid for resume', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue(null);
    await expect(service.resume('invalid-token', 'cv.pdf')).rejects.toThrow('candidate_not_found');
  });

  it('should complete resume upload and create audit event', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: 'c1',
      organizationId: 'org1',
      token: 'valid-token',
    } as never);
    vi.mocked(prisma.candidateOnboardingSession.findUnique).mockResolvedValue({ id: 'os1' } as never);

    const result = await service.resume('valid-token', 'cv.pdf');
    expect(result).toBeDefined();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'onboarding.resume_completed' }) }),
    );
  });
});

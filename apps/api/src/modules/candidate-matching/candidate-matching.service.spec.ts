import { describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    application: {
      findUnique: vi.fn(),
    },
    candidate: {
      findUnique: vi.fn(),
    },
    vacancy: {
      findUnique: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    candidateEmbedding: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    vacancyEmbedding: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    matchingScore: {
      upsert: vi.fn().mockResolvedValue({ id: 'ms1', score: 75 }),
      findUnique: vi.fn().mockResolvedValue({ id: 'ms1', score: 75, breakdowns: [], evidences: [], explanations: [] }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    matchingBreakdown: {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    },
    aiEvidence: {
      createMany: vi.fn().mockResolvedValue({}),
    },
    aiExplanation: {
      create: vi.fn().mockResolvedValue({}),
    },
    candidateComparison: {
      upsert: vi.fn().mockResolvedValue({ id: 'cc1' }),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

const mockAiGateway = {
  explainMatching: vi.fn().mockResolvedValue({
    text: 'match explanation',
    provider: 'mock',
    evidences: [{ sourceType: 'resume', sourceRef: 'ref1', excerpt: 'text', confidence: 0.8 }],
  }),
  compareCandidates: vi.fn().mockResolvedValue({ winner: 'left', reason: 'higher score' }),
};

import { CandidateMatchingService } from './candidate-matching.service.js';
import { prisma } from '@connekt/db';

describe('CandidateMatchingService', () => {
  const service = new CandidateMatchingService(mockAiGateway as never);

  it('should throw NotFoundException when application does not exist', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue(null);
    await expect(service.computeMatching('a1', 'u1')).rejects.toThrow('application_not_found');
  });

  it('should throw ForbiddenException on cross-tenant mismatch', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'a1',
      candidateId: 'c1',
      vacancyId: 'v1',
      candidate: { organizationId: 'org1', profile: {}, onboarding: null, email: 'c@c.com' },
      vacancy: { organizationId: 'org2', title: 'Dev', description: 'desc' },
      evaluations: [],
      smartInterviewSessions: [],
    } as never);
    await expect(service.computeMatching('a1', 'u1')).rejects.toThrow('candidate_vacancy_cross_tenant_mismatch');
  });

  it('should throw ForbiddenException when actor is not a member of the org', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'a1',
      candidateId: 'c1',
      vacancyId: 'v1',
      candidate: { organizationId: 'org1', profile: { fullName: 'John' }, onboarding: null, email: 'c@c.com' },
      vacancy: { organizationId: 'org1', title: 'Dev', description: 'desc' },
      evaluations: [],
      smartInterviewSessions: [],
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    await expect(service.computeMatching('a1', 'u1')).rejects.toThrow('user_not_member_of_org');
  });

  it('should compute matching and create audit event when valid', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'a1',
      candidateId: 'c1',
      vacancyId: 'v1',
      candidate: { organizationId: 'org1', profile: { fullName: 'John' }, onboarding: null, email: 'c@c.com' },
      vacancy: { organizationId: 'org1', title: 'Dev', description: 'desc' },
      evaluations: [],
      smartInterviewSessions: [],
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);

    const result = await service.computeMatching('a1', 'u1');
    expect(result).toBeDefined();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'matching.computed' }) }),
    );
  });

  it('should validate tenant for compareCandidates', async () => {
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue(null);
    await expect(service.compareCandidates('v1', 'c1', 'c2', 'u1')).rejects.toThrow('vacancy_not_found');
  });
});

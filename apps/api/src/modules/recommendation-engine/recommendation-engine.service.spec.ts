import { describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    candidate: {
      findUnique: vi.fn(),
    },
    vacancy: {
      findUnique: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    },
    matchingScore: {
      findUnique: vi.fn().mockResolvedValue({ id: 'ms1', score: 60 }),
    },
    riskEvaluation: {
      findUnique: vi.fn().mockResolvedValue({ id: 're1', riskScore: 0.3 }),
    },
    candidateRecommendation: {
      deleteMany: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: 'cr1' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

const mockAiGateway = {
  generateRecommendations: vi.fn().mockResolvedValue({
    explanation: 'AI recommendation',
    recommendations: [
      { type: 'schedule-interview', title: 'Interview', confidence: 0.8, actionableInsights: ['prepare'] },
    ],
  }),
};

import { RecommendationEngineService } from './recommendation-engine.service.js';
import { prisma } from '@connekt/db';

describe('RecommendationEngineService', () => {
  const service = new RecommendationEngineService(mockAiGateway as never);

  it('should throw NotFoundException when candidate does not exist', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    await expect(service.generate('c1', 'v1', 'u1')).rejects.toThrow('candidate_not_found');
  });

  it('should throw NotFoundException when vacancy does not exist', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue(null);
    await expect(service.generate('c1', 'v1', 'u1')).rejects.toThrow('vacancy_not_found');
  });

  it('should throw ForbiddenException on cross-tenant mismatch', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org2' } as never);
    await expect(service.generate('c1', 'v1', 'u1')).rejects.toThrow('candidate_vacancy_cross_tenant_mismatch');
  });

  it('should throw ForbiddenException when actor is not a member', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    await expect(service.generate('c1', 'v1', 'u1')).rejects.toThrow('user_not_member_of_org');
  });

  it('should generate recommendations and audit event when valid', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);

    const result = await service.generate('c1', 'v1', 'u1');
    expect(result).toBeDefined();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'recommendation.generated' }) }),
    );
  });

  it('should validate vacancy tenant on list', async () => {
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue(null);
    await expect(service.list('v1', 'u1')).rejects.toThrow('vacancy_not_found');
  });
});

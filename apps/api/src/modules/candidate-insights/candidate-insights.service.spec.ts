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
      findUnique: vi.fn().mockResolvedValue({ id: 'ms1', score: 70, breakdowns: [] }),
    },
    candidateInsight: {
      upsert: vi.fn().mockResolvedValue({ id: 'ci1', summary: 'insight' }),
    },
    aiExplanation: {
      create: vi.fn().mockResolvedValue({}),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

const mockAiGateway = {
  generateCandidateInsights: vi.fn().mockResolvedValue({
    summary: 'Good candidate',
    strengths: ['communication'],
    risks: ['experience'],
    recommendations: ['interview'],
    explanation: 'AI analysis',
    provider: 'mock',
  }),
};

import { CandidateInsightsService } from './candidate-insights.service.js';
import { prisma } from '@connekt/db';

describe('CandidateInsightsService', () => {
  const service = new CandidateInsightsService(mockAiGateway as never);

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

  it('should generate insights with audit event when valid', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);

    const result = await service.generate('c1', 'v1', 'u1');
    expect(result).toBeDefined();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'insights.generated' }) }),
    );
  });
});

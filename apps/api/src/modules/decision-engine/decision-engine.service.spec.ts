import { describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    vacancy: {
      findUnique: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    matchingScore: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    riskEvaluation: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    candidateRecommendation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    candidatePriorityScore: {
      upsert: vi.fn().mockResolvedValue({ id: 'ps1', score: 60 }),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { DecisionEngineService } from './decision-engine.service.js';
import { prisma } from '@connekt/db';

describe('DecisionEngineService', () => {
  const service = new DecisionEngineService();

  it('should throw NotFoundException when vacancy does not exist', async () => {
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue(null);
    await expect(service.calculatePriority('v1', 'u1')).rejects.toThrow('vacancy_not_found');
  });

  it('should throw ForbiddenException when actor is not a member', async () => {
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'headhunter' } as never);
    await expect(service.calculatePriority('v1', 'u1')).rejects.toThrow('user_not_member_of_org');
  });

  it('should allow global admins without membership', async () => {
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'admin' } as never);
    vi.mocked(prisma.matchingScore.findMany).mockResolvedValue([]);

    const result = await service.calculatePriority('v1', 'admin-user');
    expect(result).toEqual([]);
  });

  it('should calculate priorities and create audit event when valid', async () => {
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
    vi.mocked(prisma.matchingScore.findMany).mockResolvedValue([
      { id: 'ms1', candidateId: 'c1', vacancyId: 'v1', score: 70 } as never,
    ]);
    vi.mocked(prisma.riskEvaluation.findUnique).mockResolvedValue({ riskScore: 0.2 } as never);
    vi.mocked(prisma.candidateRecommendation.findMany).mockResolvedValue([{ id: 'cr1' }] as never);

    const result = await service.calculatePriority('v1', 'u1');
    expect(result).toBeDefined();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'decision.priority-calculated' }) }),
    );
  });
});

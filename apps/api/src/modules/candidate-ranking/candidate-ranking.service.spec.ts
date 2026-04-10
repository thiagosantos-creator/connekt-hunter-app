import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    matchingScore: { findMany: vi.fn() },
    candidateRankingSnapshot: { deleteMany: vi.fn(), create: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
    auditEvent: { create: vi.fn() },
  },
}));

import { prisma } from '@connekt/db';
import { CandidateRankingService } from './candidate-ranking.service.js';

describe('CandidateRankingService', () => {
  let service: CandidateRankingService;
  const aiGateway = { generateRankingRationale: vi.fn() };

  beforeEach(() => {
    service = new CandidateRankingService(aiGateway as never);
    vi.clearAllMocks();
  });

  it('generates assisted ranking snapshots', async () => {
    vi.mocked(prisma.matchingScore.findMany).mockResolvedValue([
      { candidateId: 'c1', score: 90 },
      { candidateId: 'c2', score: 80 },
    ] as never);
    vi.mocked(aiGateway.generateRankingRationale).mockResolvedValue({ c1: 'top', c2: 'second' });
    vi.mocked(prisma.candidateRankingSnapshot.create).mockResolvedValue({} as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);

    await service.generate('v1', 'u1');

    expect(prisma.candidateRankingSnapshot.create).toHaveBeenCalledTimes(2);
    expect(prisma.auditEvent.create).toHaveBeenCalledOnce();
  });
});

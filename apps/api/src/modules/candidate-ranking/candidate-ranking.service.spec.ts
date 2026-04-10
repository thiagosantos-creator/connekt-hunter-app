import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    matchingScore: { findMany: vi.fn() },
    candidateRankingSnapshot: { deleteMany: vi.fn(), create: vi.fn(), findMany: vi.fn() },
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
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
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

  it('overrides ranking by rewriting snapshots in a transaction', async () => {
    vi.mocked(prisma.candidateRankingSnapshot.findMany)
      .mockResolvedValueOnce([
        { candidateId: 'c1', score: 90 },
        { candidateId: 'c2', score: 80 },
      ] as never)
      .mockResolvedValueOnce([{ rank: 1 }, { rank: 2 }] as never);
    vi.mocked(prisma.candidateRankingSnapshot.deleteMany).mockResolvedValue({ count: 2 } as never);
    vi.mocked(prisma.candidateRankingSnapshot.create).mockResolvedValue({} as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);

    await service.override('v1', ['c2', 'c1'], 'u1');

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.candidateRankingSnapshot.deleteMany).toHaveBeenCalledWith({ where: { vacancyId: 'v1' } });
    expect(prisma.candidateRankingSnapshot.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ candidateId: 'c2', rank: 1, score: 80, manualOverride: true }) }),
    );
    expect(prisma.candidateRankingSnapshot.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ candidateId: 'c1', rank: 2, score: 90, manualOverride: true }) }),
    );
    expect(prisma.auditEvent.create).toHaveBeenCalledOnce();
  });
});

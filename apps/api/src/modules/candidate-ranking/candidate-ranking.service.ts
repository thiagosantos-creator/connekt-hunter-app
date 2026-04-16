import { Inject, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { AiGateway } from '../integrations/ai.gateway.js';

@Injectable()
export class CandidateRankingService {
  constructor(@Inject(AiGateway) private readonly aiGateway: AiGateway) {}

  async generate(vacancyId: string, actorId?: string) {
    const scores = await prisma.matchingScore.findMany({
      where: { vacancyId },
      include: { candidate: true },
      orderBy: { score: 'desc' },
    });

    await prisma.candidateRankingSnapshot.deleteMany({ where: { vacancyId } });

    const rationale = await this.aiGateway.generateRankingRationale({
      vacancyId,
      candidates: scores.map((score) => ({ candidateId: score.candidateId, score: score.score })),
    });

    const created = await prisma.candidateRankingSnapshot.createMany({
      data: scores.map((item, idx) => ({
        vacancyId,
        candidateId: item.candidateId,
        rank: idx + 1,
        score: item.score,
        rationale: rationale[item.candidateId] ?? 'Ranking assistido por matching score e sinais qualitativos.',
      })),
    });

    const snapshots = await prisma.candidateRankingSnapshot.findMany({
      where: { vacancyId },
      orderBy: { rank: 'asc' },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'ranking.generated',
        entityType: 'Vacancy',
        entityId: vacancyId,
        metadata: { count: created.count } as never,
      },
    });

    return snapshots;
  }

  async list(vacancyId: string) {
    return prisma.candidateRankingSnapshot.findMany({
      where: { vacancyId },
      include: { candidate: true },
      orderBy: { rank: 'asc' },
    });
  }

  async override(vacancyId: string, orderedCandidateIds: string[], actorId?: string) {
    const manualRationale = 'Ranking ajustado manualmente por usuário autorizado.';

    await prisma.$transaction(async (tx) => {
      const existing = await tx.candidateRankingSnapshot.findMany({
        where: { vacancyId, candidateId: { in: orderedCandidateIds } },
        select: { candidateId: true, score: true },
      });

      const scoresByCandidate = new Map(existing.map((snapshot) => [snapshot.candidateId, snapshot.score]));

      await tx.candidateRankingSnapshot.deleteMany({ where: { vacancyId } });

      for (const [idx, candidateId] of orderedCandidateIds.entries()) {
        await tx.candidateRankingSnapshot.create({
          data: {
            vacancyId,
            candidateId,
            rank: idx + 1,
            score: scoresByCandidate.get(candidateId) ?? 0,
            manualOverride: true,
            rationale: manualRationale,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          actorId,
          action: 'ranking.overridden',
          entityType: 'Vacancy',
          entityId: vacancyId,
          metadata: { orderedCandidateIds } as never,
        },
      });
    });

    return this.list(vacancyId);
  }
}

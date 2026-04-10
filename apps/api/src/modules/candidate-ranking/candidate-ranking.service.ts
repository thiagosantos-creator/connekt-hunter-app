import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { AiGateway } from '../integrations/ai.gateway.js';

@Injectable()
export class CandidateRankingService {
  constructor(private readonly aiGateway: AiGateway) {}

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

    const created = [];
    for (const [idx, item] of scores.entries()) {
      created.push(
        await prisma.candidateRankingSnapshot.create({
          data: {
            vacancyId,
            candidateId: item.candidateId,
            rank: idx + 1,
            score: item.score,
            rationale: rationale[item.candidateId] ?? 'Ranking assistido por matching score e sinais qualitativos.',
          },
        }),
      );
    }

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'ranking.generated',
        entityType: 'Vacancy',
        entityId: vacancyId,
        metadata: { count: created.length } as never,
      },
    });

    return created;
  }

  async list(vacancyId: string) {
    return prisma.candidateRankingSnapshot.findMany({
      where: { vacancyId },
      include: { candidate: true },
      orderBy: { rank: 'asc' },
    });
  }

  async override(vacancyId: string, orderedCandidateIds: string[], actorId?: string) {
    for (const [idx, candidateId] of orderedCandidateIds.entries()) {
      await prisma.candidateRankingSnapshot.upsert({
        where: { vacancyId_candidateId: { vacancyId, candidateId } },
        update: { rank: idx + 1, manualOverride: true, rationale: 'Ranking ajustado manualmente por usuário autorizado.' },
        create: { vacancyId, candidateId, rank: idx + 1, score: 0, manualOverride: true, rationale: 'Ranking ajustado manualmente por usuário autorizado.' },
      });
    }

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'ranking.overridden',
        entityType: 'Vacancy',
        entityId: vacancyId,
        metadata: { orderedCandidateIds } as never,
      },
    });

    return this.list(vacancyId);
  }
}

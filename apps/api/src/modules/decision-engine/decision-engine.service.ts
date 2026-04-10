import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class DecisionEngineService {
  async calculatePriority(vacancyId: string, actorId?: string) {
    const scores = await prisma.matchingScore.findMany({ where: { vacancyId } });

    const output = [];
    for (const score of scores) {
      const risk = await prisma.riskEvaluation.findUnique({ where: { candidateId_vacancyId: { candidateId: score.candidateId, vacancyId } } });
      const recommendations = await prisma.candidateRecommendation.findMany({ where: { candidateId: score.candidateId, vacancyId } });
      const riskPenalty = (risk?.riskScore ?? 0.2) * 25;
      const recommendationBoost = recommendations.length * 3;
      const priorityScore = Math.max(0, Math.min(100, score.score - riskPenalty + recommendationBoost));
      const priorityBand = priorityScore >= 75 ? 'high' : priorityScore >= 45 ? 'medium' : 'low';

      output.push(await prisma.candidatePriorityScore.upsert({
        where: { candidateId_vacancyId: { candidateId: score.candidateId, vacancyId } },
        update: {
          score: priorityScore,
          priorityBand,
          rationale: 'Priorização dinâmica assistiva: matching, risco e recomendações. Decisão final sempre humana.',
          factors: { matching: score.score, riskPenalty, recommendationBoost } as never,
        },
        create: {
          candidateId: score.candidateId,
          vacancyId,
          score: priorityScore,
          priorityBand,
          rationale: 'Priorização dinâmica assistiva: matching, risco e recomendações. Decisão final sempre humana.',
          factors: { matching: score.score, riskPenalty, recommendationBoost } as never,
        },
      }));
    }

    await prisma.auditEvent.create({ data: { actorId, action: 'decision.priority-calculated', entityType: 'Vacancy', entityId: vacancyId, metadata: { count: output.length } as never } });

    return output.sort((a, b) => b.score - a.score);
  }
}

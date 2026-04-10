import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { AiGateway } from '../integrations/ai.gateway.js';

@Injectable()
export class RecommendationEngineService {
  constructor(private readonly aiGateway: AiGateway) {}

  async generate(candidateId: string, vacancyId: string, actorId?: string) {
    const matching = await prisma.matchingScore.findUnique({ where: { candidateId_vacancyId: { candidateId, vacancyId } } });
    const risk = await prisma.riskEvaluation.findUnique({ where: { candidateId_vacancyId: { candidateId, vacancyId } } });

    const ai = await this.aiGateway.generateRecommendations({ candidateId, vacancyId, matchingScore: matching?.score, riskScore: risk?.riskScore });

    await prisma.candidateRecommendation.deleteMany({ where: { candidateId, vacancyId } });

    const created = [];
    for (const item of ai.recommendations) {
      created.push(await prisma.candidateRecommendation.create({
        data: {
          candidateId,
          vacancyId,
          recommendationType: item.type,
          title: item.title,
          explanation: ai.explanation,
          confidence: item.confidence,
          actionableInsights: item.actionableInsights as never,
        },
      }));
    }

    await prisma.auditEvent.create({ data: { actorId, action: 'recommendation.generated', entityType: 'Candidate', entityId: candidateId, metadata: { vacancyId, count: created.length } as never } });

    return created;
  }

  async list(vacancyId: string) {
    return prisma.candidateRecommendation.findMany({ where: { vacancyId }, orderBy: { createdAt: 'desc' } });
  }
}

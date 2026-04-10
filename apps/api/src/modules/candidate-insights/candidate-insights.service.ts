import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { AiGateway } from '../integrations/ai.gateway.js';

@Injectable()
export class CandidateInsightsService {
  constructor(private readonly aiGateway: AiGateway) {}

  async generate(candidateId: string, vacancyId: string, actorId?: string) {
    const matching = await prisma.matchingScore.findUnique({
      where: { candidateId_vacancyId: { candidateId, vacancyId } },
      include: { breakdowns: true },
    });

    const response = await this.aiGateway.generateCandidateInsights({ candidateId, vacancyId, matching });

    const insight = await prisma.candidateInsight.upsert({
      where: { candidateId_vacancyId: { candidateId, vacancyId } },
      update: {
        summary: response.summary,
        strengths: response.strengths as never,
        risks: response.risks as never,
        recommendations: response.recommendations as never,
      },
      create: {
        candidateId,
        vacancyId,
        summary: response.summary,
        strengths: response.strengths as never,
        risks: response.risks as never,
        recommendations: response.recommendations as never,
      },
    });

    await prisma.aiExplanation.create({
      data: {
        candidateId,
        context: 'candidate-insights',
        explanation: response.explanation,
        generatedBy: response.provider,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'insights.generated',
        entityType: 'Candidate',
        entityId: candidateId,
        metadata: { vacancyId, insightId: insight.id } as never,
      },
    });

    return insight;
  }

  async get(candidateId: string, vacancyId: string) {
    return prisma.candidateInsight.findUnique({
      where: { candidateId_vacancyId: { candidateId, vacancyId } },
    });
  }
}

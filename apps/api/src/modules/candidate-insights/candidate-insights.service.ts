import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { AiGateway } from '../integrations/ai.gateway.js';

@Injectable()
export class CandidateInsightsService {
  constructor(@Inject(AiGateway) private readonly aiGateway: AiGateway) {}

  private async assertTenantAccess(organizationId: string, actorId?: string): Promise<void> {
    if (!actorId) return;
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId: actorId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }

  async generate(candidateId: string, vacancyId: string, actorId?: string) {
    const [candidate, vacancy] = await Promise.all([
      prisma.candidate.findUnique({ where: { id: candidateId } }),
      prisma.vacancy.findUnique({ where: { id: vacancyId } }),
    ]);
    if (!candidate) throw new NotFoundException('candidate_not_found');
    if (!vacancy) throw new NotFoundException('vacancy_not_found');
    if (candidate.organizationId !== vacancy.organizationId) {
      throw new ForbiddenException('candidate_vacancy_cross_tenant_mismatch');
    }
    await this.assertTenantAccess(vacancy.organizationId, actorId);

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

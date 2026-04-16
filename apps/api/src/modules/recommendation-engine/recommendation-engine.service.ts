import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { AiGateway } from '../integrations/ai.gateway.js';
import { assertOrganizationAccess } from '../auth/organization-access.util.js';

@Injectable()
export class RecommendationEngineService {
  constructor(@Inject(AiGateway) private readonly aiGateway: AiGateway) {}

  private async assertTenantAccess(organizationId: string, actorId?: string): Promise<void> {
    await assertOrganizationAccess(organizationId, actorId);
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

    const matching = await prisma.matchingScore.findUnique({ where: { candidateId_vacancyId: { candidateId, vacancyId } } });
    const risk = await prisma.riskEvaluation.findUnique({ where: { candidateId_vacancyId: { candidateId, vacancyId } } });

    const ai = await this.aiGateway.generateRecommendations({ candidateId, vacancyId, matchingScore: matching?.score, riskScore: risk?.riskScore });

    await prisma.candidateRecommendation.updateMany({
      where: { candidateId, vacancyId, status: 'active' },
      data: { status: 'superseded' },
    });

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

  async list(vacancyId: string, actorId?: string) {
    const vacancy = await prisma.vacancy.findUnique({ where: { id: vacancyId } });
    if (!vacancy) throw new NotFoundException('vacancy_not_found');
    await this.assertTenantAccess(vacancy.organizationId, actorId);
    return prisma.candidateRecommendation.findMany({ where: { vacancyId, status: 'active' }, orderBy: { createdAt: 'desc' } });
  }
}

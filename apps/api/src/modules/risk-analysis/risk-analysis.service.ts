import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { AiGateway } from '../integrations/ai.gateway.js';
import { assertOrganizationAccess } from '../auth/organization-access.util.js';

@Injectable()
export class RiskAnalysisService {
  constructor(@Inject(AiGateway) private readonly aiGateway: AiGateway) {}

  private async assertTenantAccess(organizationId: string, actorId?: string): Promise<void> {
    await assertOrganizationAccess(organizationId, actorId);
  }

  async analyze(candidateId: string, vacancyId: string, actorId?: string) {
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

    const result = await this.aiGateway.analyzeRiskPatterns({ candidateId, vacancyId });

    await prisma.riskSignal.deleteMany({ where: { candidateId, vacancyId } });
    for (const finding of result.findings) {
      await prisma.riskSignal.create({
        data: { candidateId, vacancyId, signalType: finding.type, severity: finding.severity, score: finding.score, details: { detail: finding.detail } as never },
      });
    }

    const evaluation = await prisma.riskEvaluation.upsert({
      where: { candidateId_vacancyId: { candidateId, vacancyId } },
      update: { overallRisk: result.overallRisk, riskScore: result.riskScore, findings: result.findings as never, explanation: result.explanation, requiresReview: true },
      create: { candidateId, vacancyId, overallRisk: result.overallRisk, riskScore: result.riskScore, findings: result.findings as never, explanation: result.explanation, requiresReview: true },
    });

    await prisma.auditEvent.create({ data: { actorId, action: 'risk.analyzed', entityType: 'Candidate', entityId: candidateId, metadata: { vacancyId, riskScore: result.riskScore } as never } });

    return evaluation;
  }

  private static readonly VALID_REVIEW_ACTIONS = ['dismiss', 'accept', 'escalate'] as const;

  async review(
    evaluationId: string,
    actorId: string,
    action: string,
    reason?: string,
  ) {
    if (!RiskAnalysisService.VALID_REVIEW_ACTIONS.includes(action as never)) {
      throw new BadRequestException(
        `invalid_review_action: must be one of ${RiskAnalysisService.VALID_REVIEW_ACTIONS.join(', ')}`,
      );
    }

    const evaluation = await prisma.riskEvaluation.findUnique({
      where: { id: evaluationId },
      include: { vacancy: true },
    });
    if (!evaluation) throw new NotFoundException('risk_evaluation_not_found');

    await this.assertTenantAccess(evaluation.vacancy.organizationId, actorId);

    const updated = await prisma.riskEvaluation.update({
      where: { id: evaluationId },
      data: {
        requiresReview: action === 'escalate',
        reviewedAt: new Date(),
        reviewedBy: actorId,
        reviewAction: action,
        reviewReason: reason ?? null,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'risk.reviewed',
        entityType: 'RiskEvaluation',
        entityId: evaluationId,
        metadata: { reviewAction: action, reason } as never,
      },
    });

    return updated;
  }

  async get(candidateId: string, vacancyId: string) {
    return prisma.riskEvaluation.findUnique({ where: { candidateId_vacancyId: { candidateId, vacancyId } } });
  }
}

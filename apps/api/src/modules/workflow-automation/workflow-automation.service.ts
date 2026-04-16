import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { assertOrganizationAccess } from '../auth/organization-access.util.js';

@Injectable()
export class WorkflowAutomationService {
  async suggest(candidateId: string, vacancyId: string, actorId?: string) {
    const [candidate, vacancy] = await Promise.all([
      prisma.candidate.findUnique({ where: { id: candidateId } }),
      prisma.vacancy.findUnique({ where: { id: vacancyId } }),
    ]);

    if (!candidate) throw new NotFoundException('candidate_not_found');
    if (!vacancy) throw new NotFoundException('vacancy_not_found');
    if (candidate.organizationId !== vacancy.organizationId) {
      throw new BadRequestException('candidate_vacancy_cross_tenant_mismatch');
    }

    if (actorId) {
      await assertOrganizationAccess(vacancy.organizationId, actorId);
    }

    const [matching, risk, application] = await Promise.all([
      prisma.matchingScore.findUnique({ where: { candidateId_vacancyId: { candidateId, vacancyId } } }),
      prisma.riskEvaluation.findUnique({ where: { candidateId_vacancyId: { candidateId, vacancyId } } }),
      prisma.application.findFirst({ where: { candidateId, vacancyId }, include: { smartInterviewSessions: true } }),
    ]);

    const suggestions: Array<{ type: string; payload: Record<string, unknown>; explanation: string }> = [];

    const matchScore = matching?.score ?? 0;
    const riskScore = risk?.riskScore ?? 0;
    const hasInterview = (application?.smartInterviewSessions?.length ?? 0) > 0;
    const stage = application?.status ?? 'applied';

    if (matchScore >= 60 && !hasInterview) {
      suggestions.push({
        type: 'schedule-interview',
        payload: { template: matchScore >= 80 ? 'senior-depth' : 'technical-depth' },
        explanation: `Score de ${matchScore} indica boa aderência. Entrevista técnica recomendada para validação prática.`,
      });
    }

    if (riskScore >= 0.5 && risk?.requiresReview) {
      suggestions.push({
        type: 'request-risk-review',
        payload: { riskLevel: risk.overallRisk, riskScore },
        explanation: `Risco ${risk.overallRisk} (${(riskScore * 100).toFixed(0)}%) detectado. Revisão humana recomendada antes de avançar.`,
      });
    }

    if (matchScore >= 40 && stage === 'applied') {
      suggestions.push({
        type: 'request-feedback',
        payload: { channel: 'email' },
        explanation: 'Coleta de evidências adicionais recomendada para enriquecer avaliação do candidato.',
      });
    }

    if (matchScore >= 75 && riskScore < 0.3 && hasInterview) {
      suggestions.push({
        type: 'advance-to-shortlist',
        payload: { matchScore, riskScore },
        explanation: `Alta aderência (${matchScore}) com baixo risco (${(riskScore * 100).toFixed(0)}%). Candidato pronto para shortlist.`,
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: 'request-feedback',
        payload: { channel: 'email' },
        explanation: 'Ação sugerida para coletar evidências adicionais antes da decisão.',
      });
    }

    await prisma.workflowSuggestion.updateMany({
      where: { candidateId, vacancyId, status: 'pending' },
      data: { status: 'superseded' },
    });
    const created = [];
    for (const item of suggestions) {
      created.push(
        await prisma.workflowSuggestion.create({
          data: {
            candidateId,
            vacancyId,
            suggestionType: item.type,
            payload: item.payload as never,
            explanation: item.explanation,
            requiresHumanApproval: true,
          },
        }),
      );
    }

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'workflow.suggested',
        entityType: 'Candidate',
        entityId: candidateId,
        metadata: { vacancyId, count: created.length } as never,
      },
    });

    return created;
  }

  async execute(suggestionId: string, actorId?: string) {
    const suggestion = await prisma.workflowSuggestion.findUnique({
      where: { id: suggestionId },
      include: { vacancy: true },
    });
    if (!suggestion) throw new NotFoundException('workflow_suggestion_not_found');
    if (suggestion.status !== 'pending') throw new BadRequestException('workflow_suggestion_not_pending');

    if (actorId) {
      await assertOrganizationAccess(suggestion.vacancy.organizationId, actorId);
    }

    const execution = await prisma.automationExecution.create({
      data: {
        candidateId: suggestion.candidateId,
        vacancyId: suggestion.vacancyId,
        workflowSuggestionId: suggestion.id,
        action: suggestion.suggestionType,
        status: 'executed_assisted',
        inputJson: suggestion.payload as never,
        outputJson: { success: true, message: 'Automação assistida executada com aprovação humana.' } as never,
        executedAt: new Date(),
        triggeredBy: actorId,
      },
    });

    await prisma.workflowSuggestion.update({ where: { id: suggestionId }, data: { status: 'approved' } });
    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'automation.executed',
        entityType: 'WorkflowSuggestion',
        entityId: suggestionId,
        metadata: { executionId: execution.id } as never,
      },
    });

    return execution;
  }
}

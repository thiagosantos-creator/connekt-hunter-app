import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class WorkflowAutomationService {
  async suggest(candidateId: string, vacancyId: string, actorId?: string) {
    const suggestions = [
      { type: 'schedule-interview', payload: { template: 'technical-depth' }, explanation: 'Ação sugerida para validar sinais pendentes. Exige aprovação humana.' },
      { type: 'request-feedback', payload: { channel: 'email' }, explanation: 'Ação sugerida para coletar evidências adicionais antes da decisão.' },
    ];

    await prisma.workflowSuggestion.deleteMany({ where: { candidateId, vacancyId } });
    const created = [];
    for (const item of suggestions) {
      created.push(await prisma.workflowSuggestion.create({
        data: { candidateId, vacancyId, suggestionType: item.type, payload: item.payload as never, explanation: item.explanation, requiresHumanApproval: true },
      }));
    }

    await prisma.auditEvent.create({ data: { actorId, action: 'workflow.suggested', entityType: 'Candidate', entityId: candidateId, metadata: { vacancyId, count: created.length } as never } });

    return created;
  }

  async execute(suggestionId: string, actorId?: string) {
    const suggestion = await prisma.workflowSuggestion.findUniqueOrThrow({ where: { id: suggestionId } });

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
    await prisma.auditEvent.create({ data: { actorId, action: 'automation.executed', entityType: 'WorkflowSuggestion', entityId: suggestionId, metadata: { executionId: execution.id } as never } });

    return execution;
  }
}

import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { IntegrationsConfigService } from './integrations-config.service.js';

@Injectable()
export class AiGateway {
  constructor(private readonly config: IntegrationsConfigService) {}

  async generateInterviewQuestions(input: { templateId: string; context: Record<string, unknown> }) {
    const provider = this.config.isIntegrationEnabled('ai') ? 'ai-real' : 'ai-mock';
    const promptVersion = 'smart-interview.questions.v1';
    const modelVersion = provider === 'ai-real' ? process.env.AI_MODEL_VERSION ?? 'gpt-4.1-mini' : 'mock-v1';

    const questions = [
      'Descreva uma entrega de alto impacto que você liderou nos últimos 12 meses.',
      'Quando um requisito muda no meio da sprint, como você adapta plano e comunicação?',
      'Mostre um exemplo de decisão técnica em que você mediu trade-offs.',
    ];

    const log = await prisma.aiExecutionLog.create({
      data: {
        operation: 'generate-questions',
        provider,
        modelVersion,
        promptVersion,
        status: 'success',
        requestJson: input as never,
        responseJson: { questions } as never,
      },
    });

    return { questions, executionId: log.id, provider, modelVersion, promptVersion };
  }

  async analyzeInterview(input: { sessionId: string; transcript: string }) {
    const provider = this.config.isIntegrationEnabled('ai') ? 'ai-real' : 'ai-mock';
    const result = {
      summary: `Resumo assistivo para sessão ${input.sessionId}`,
      highlights: ['comunicação clara', 'senso de prioridade'],
      risks: ['aprofundar arquitetura distribuída'],
      evidence: ['citou métrica de redução de latência em 22%'],
      recommendation: 'assistive_only',
    };

    await prisma.aiExecutionLog.create({
      data: {
        operation: 'analyze-interview',
        provider,
        modelVersion: provider === 'ai-real' ? process.env.AI_MODEL_VERSION ?? 'gpt-4.1-mini' : 'mock-v1',
        promptVersion: 'smart-interview.analysis.v1',
        status: 'success',
        requestJson: input as never,
        responseJson: result as never,
      },
    });

    return result;
  }
}

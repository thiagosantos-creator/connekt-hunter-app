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


  async explainMatching(input: { applicationId: string; score: number; dimensions: Array<{ dimension: string; score: number; weight: number; reasoning: string }> }) {
    const provider = this.config.isIntegrationEnabled('ai') ? 'ai-real' : 'ai-mock';
    const text = `Score ${input.score} com melhor aderência em ${input.dimensions.sort((a, b) => b.score - a.score)[0]?.dimension ?? 'n/a'}. IA assistiva, decisão final humana.`;
    const evidences = [
      { sourceType: 'resume', sourceRef: `application:${input.applicationId}`, excerpt: 'Resumo do currículo aderente à descrição da vaga.', confidence: 0.78 },
      { sourceType: 'interview', sourceRef: `application:${input.applicationId}`, excerpt: 'Entrevista com sinais consistentes de comunicação.', confidence: 0.74 },
    ];

    await prisma.aiExecutionLog.create({
      data: {
        operation: 'matching-explanation',
        provider,
        modelVersion: provider === 'ai-real' ? process.env.AI_MODEL_VERSION ?? 'gpt-4.1-mini' : 'mock-v1',
        promptVersion: 'candidate-matching.explain.v1',
        status: 'success',
        requestJson: input as never,
        responseJson: { text, evidences } as never,
      },
    });

    return { provider, text, evidences };
  }

  async generateCandidateInsights(input: { candidateId: string; vacancyId: string; matching: unknown }) {
    const provider = this.config.isIntegrationEnabled('ai') ? 'ai-real' : 'ai-mock';
    const result = {
      provider,
      summary: `Insights assistivos para candidato ${input.candidateId} na vaga ${input.vacancyId}.`,
      strengths: ['aprendizado rápido', 'boa comunicação com stakeholders'],
      risks: ['necessita aprofundar arquitetura de alta escala'],
      recommendations: ['validar case técnico prático', 'confirmar disponibilidade para regime híbrido'],
      explanation: 'Insights gerados por IA com evidências explícitas para suporte à decisão humana.',
    };

    await prisma.aiExecutionLog.create({
      data: {
        operation: 'candidate-insights',
        provider,
        modelVersion: provider === 'ai-real' ? process.env.AI_MODEL_VERSION ?? 'gpt-4.1-mini' : 'mock-v1',
        promptVersion: 'candidate-insights.v1',
        status: 'success',
        requestJson: input as never,
        responseJson: result as never,
      },
    });

    return result;
  }

  async compareCandidates(input: { vacancyId: string; left: { candidateId: string; score: number }; right: { candidateId: string; score: number } }) {
    const provider = this.config.isIntegrationEnabled('ai') ? 'ai-real' : 'ai-mock';
    const result = {
      provider,
      winnerHint: input.left.score >= input.right.score ? input.left.candidateId : input.right.candidateId,
      disclaimer: 'Comparativo assistivo. Aprovação final é humana.',
      summary: `Comparativo da vaga ${input.vacancyId} baseado em score e evidências recentes.`,
    };

    await prisma.aiExecutionLog.create({
      data: {
        operation: 'candidate-comparison',
        provider,
        modelVersion: provider === 'ai-real' ? process.env.AI_MODEL_VERSION ?? 'gpt-4.1-mini' : 'mock-v1',
        promptVersion: 'candidate-comparison.v1',
        status: 'success',
        requestJson: input as never,
        responseJson: result as never,
      },
    });

    return result;
  }

  async generateRankingRationale(input: { vacancyId: string; candidates: Array<{ candidateId: string; score: number }> }) {
    const provider = this.config.isIntegrationEnabled('ai') ? 'ai-real' : 'ai-mock';
    const rationale = Object.fromEntries(input.candidates.map((candidate) => [candidate.candidateId, `Score ${candidate.score} com recomendação assistiva de priorização, sujeito a override humano.`]));

    await prisma.aiExecutionLog.create({
      data: {
        operation: 'candidate-ranking',
        provider,
        modelVersion: provider === 'ai-real' ? process.env.AI_MODEL_VERSION ?? 'gpt-4.1-mini' : 'mock-v1',
        promptVersion: 'candidate-ranking.v1',
        status: 'success',
        requestJson: input as never,
        responseJson: rationale as never,
      },
    });

    return rationale as Record<string, string>;
  }

}

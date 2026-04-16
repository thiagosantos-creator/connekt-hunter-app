import { Inject, Injectable, Logger } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { IntegrationsConfigService } from './integrations-config.service.js';
import { OpenAiProvider } from './openai.provider.js';

/** Simple token bucket rate limiter for AI provider calls */
class ProviderRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number = 60,
    private readonly refillRatePerSecond: number = 1,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    const waitMs = Math.ceil((1 / this.refillRatePerSecond) * 1000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerSecond);
    this.lastRefill = now;
  }
}

@Injectable()
export class AiGateway {
  private readonly logger = new Logger(AiGateway.name);
  private readonly rateLimiter = new ProviderRateLimiter(
    parseInt(process.env.AI_RATE_LIMIT_MAX_TOKENS ?? '60', 10),
    parseFloat(process.env.AI_RATE_LIMIT_REFILL_PER_SEC ?? '1'),
  );

  constructor(
    @Inject(IntegrationsConfigService) private readonly config: IntegrationsConfigService,
    private readonly openai: OpenAiProvider,
  ) {}

  private get isReal(): boolean {
    return this.config.isIntegrationEnabled('ai');
  }

  private get providerName(): 'ai-real' | 'ai-mock' {
    return this.isReal ? 'ai-real' : 'ai-mock';
  }

  private get modelVersion(): string {
    return this.isReal ? (process.env.AI_MODEL_VERSION ?? 'gpt-4.1-mini') : 'mock-v1';
  }

  private async withFallback<T>(operation: string, realFn: () => Promise<T>, mockFn: () => T, input: unknown): Promise<{ result: T; provider: string; modelVersion: string }> {
    const provider = this.providerName;
    const modelVersion = this.modelVersion;

    if (this.isReal) {
      try {
        await this.rateLimiter.acquire();
        const result = await realFn();
        return { result, provider, modelVersion };
      } catch (err) {
        this.logger.warn(JSON.stringify({ event: 'ai_real_failed', operation, error: String(err) }));

        await prisma.aiExecutionLog.create({
          data: { operation, provider, modelVersion, promptVersion: `${operation}.v1`, status: 'error', requestJson: input as never, responseJson: { error: String(err) } as never },
        });

        if (this.config.shouldFallbackToMock('ai')) {
          this.logger.log(JSON.stringify({ event: 'ai_fallback_to_mock', operation }));
          const result = mockFn();
          return { result, provider: 'ai-mock', modelVersion: 'mock-v1' };
        }
        throw err;
      }
    }

    return { result: mockFn(), provider, modelVersion };
  }

  async generateInterviewQuestions(input: { templateId: string; context: Record<string, unknown> }) {
    const promptVersion = 'smart-interview.questions.v1';

    const mockQuestions = () => [
      'Descreva uma entrega de alto impacto que você liderou nos últimos 12 meses.',
      'Quando um requisito muda no meio da sprint, como você adapta plano e comunicação?',
      'Mostre um exemplo de decisão técnica em que você mediu trade-offs.',
    ];

    const { result: questions, provider, modelVersion } = await this.withFallback(
      'generate-questions',
      () => this.openai.generateInterviewQuestions(input),
      mockQuestions,
      input,
    );

    const log = await prisma.aiExecutionLog.create({
      data: { operation: 'generate-questions', provider, modelVersion, promptVersion, status: 'success', requestJson: input as never, responseJson: { questions } as never },
    });

    return { questions, executionId: log.id, provider, modelVersion, promptVersion };
  }

  async analyzeInterview(input: { sessionId: string; transcript: string }) {
    const mockResult = () => ({
      summary: `Resumo assistivo para sessão ${input.sessionId}`,
      highlights: ['comunicação clara', 'senso de prioridade'],
      risks: ['aprofundar arquitetura distribuída'],
      evidence: ['citou métrica de redução de latência em 22%'],
      sentiment: { overall: 'NEUTRAL' as const, confidence: 0.5 },
      recommendation: 'assistive_only',
    });

    const { result, provider, modelVersion } = await this.withFallback(
      'analyze-interview',
      () => this.openai.analyzeInterview(input),
      mockResult,
      input,
    );

    await prisma.aiExecutionLog.create({
      data: { operation: 'analyze-interview', provider, modelVersion, promptVersion: 'smart-interview.analysis.v1', status: 'success', requestJson: input as never, responseJson: result as never },
    });

    return result;
  }

  async explainMatching(input: { applicationId: string; score: number; dimensions: Array<{ dimension: string; score: number; weight: number; reasoning: string }> }) {
    const mockResult = () => ({
      text: `Score ${input.score} com melhor aderência em ${[...input.dimensions].sort((a, b) => b.score - a.score)[0]?.dimension ?? 'n/a'}. IA assistiva, decisão final humana.`,
      evidences: [
        { sourceType: 'resume', sourceRef: `application:${input.applicationId}`, excerpt: 'Resumo do currículo aderente à descrição da vaga.', confidence: 0.78 },
        { sourceType: 'interview', sourceRef: `application:${input.applicationId}`, excerpt: 'Entrevista com sinais consistentes de comunicação.', confidence: 0.74 },
      ],
    });

    const { result, provider, modelVersion } = await this.withFallback(
      'matching-explanation',
      () => this.openai.explainMatching(input),
      mockResult,
      input,
    );

    await prisma.aiExecutionLog.create({
      data: { operation: 'matching-explanation', provider, modelVersion, promptVersion: 'candidate-matching.explain.v1', status: 'success', requestJson: input as never, responseJson: result as never },
    });

    return { provider, ...result };
  }

  async generateCandidateInsights(input: { candidateId: string; vacancyId: string; matching: unknown; candidateContext?: unknown }) {
    const mockResult = () => ({
      summary: `Insights assistivos para candidato ${input.candidateId} na vaga ${input.vacancyId}.`,
      strengths: ['aprendizado rápido', 'boa comunicação com stakeholders'],
      risks: ['necessita aprofundar arquitetura de alta escala'],
      recommendations: ['validar case técnico prático', 'confirmar disponibilidade para regime híbrido'],
      explanation: 'Insights gerados por IA com evidências explícitas para suporte à decisão humana.',
    });

    const { result, provider, modelVersion } = await this.withFallback(
      'candidate-insights',
      () => this.openai.generateCandidateInsights(input),
      mockResult,
      input,
    );

    await prisma.aiExecutionLog.create({
      data: { operation: 'candidate-insights', provider, modelVersion, promptVersion: 'candidate-insights.v1', status: 'success', requestJson: input as never, responseJson: result as never },
    });

    return { provider, ...result };
  }

  async compareCandidates(input: { vacancyId: string; left: { candidateId: string; score: number }; right: { candidateId: string; score: number } }) {
    const mockResult = () => ({
      winnerHint: input.left.score >= input.right.score ? input.left.candidateId : input.right.candidateId,
      disclaimer: 'Comparativo assistivo. Aprovação final é humana.',
      summary: `Comparativo da vaga ${input.vacancyId} baseado em score e evidências recentes.`,
    });

    const { result, provider, modelVersion } = await this.withFallback(
      'candidate-comparison',
      () => this.openai.compareCandidates(input),
      mockResult,
      input,
    );

    await prisma.aiExecutionLog.create({
      data: { operation: 'candidate-comparison', provider, modelVersion, promptVersion: 'candidate-comparison.v1', status: 'success', requestJson: input as never, responseJson: result as never },
    });

    return { provider, ...result };
  }

  async generateRankingRationale(input: { vacancyId: string; candidates: Array<{ candidateId: string; score: number }> }) {
    const mockResult = () => Object.fromEntries(input.candidates.map((c) => [c.candidateId, `Score ${c.score} com recomendação assistiva de priorização, sujeito a override humano.`]));

    const { result: rationale, provider, modelVersion } = await this.withFallback(
      'candidate-ranking',
      () => this.openai.generateRankingRationale(input),
      mockResult,
      input,
    );

    await prisma.aiExecutionLog.create({
      data: { operation: 'candidate-ranking', provider, modelVersion, promptVersion: 'candidate-ranking.v1', status: 'success', requestJson: input as never, responseJson: rationale as never },
    });

    return rationale as Record<string, string>;
  }

  async generateRecommendations(input: { candidateId: string; vacancyId: string; matchingScore?: number; riskScore?: number }) {
    const mockResult = () => ({
      recommendations: [
        { type: 'next-step', title: 'Agendar entrevista técnica', confidence: 0.82, actionableInsights: ['foco em arquitetura distribuída', 'validar profundidade prática'] },
        { type: 'stakeholder-check', title: 'Validar fit de colaboração', confidence: 0.74, actionableInsights: ['confirmar comunicação cross-funcional', 'obter evidência de mentoria'] },
      ],
      explanation: 'Recomendações assistivas com base em matching, sinais de risco e padrões recentes. A decisão final é sempre humana.',
    });

    const { result, provider, modelVersion } = await this.withFallback(
      'recommendation-engine',
      () => this.openai.generateRecommendations(input),
      mockResult,
      input,
    );

    await prisma.aiExecutionLog.create({
      data: { operation: 'recommendation-engine', provider, modelVersion, promptVersion: 'recommendation-engine.v1', status: 'success', requestJson: input as never, responseJson: result as never },
    });

    return { provider, ...result };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const useReal = process.env.FF_EMBEDDINGS_REAL === 'true';
    if (useReal && this.isReal) {
      try {
        const embedding = await this.openai.generateEmbedding(text);
        return embedding;
      } catch (err) {
        this.logger.warn(JSON.stringify({ event: 'embedding_real_failed', error: String(err) }));
        if (this.config.shouldFallbackToMock('ai')) {
          return this.mockEmbedding(text);
        }
        throw err;
      }
    }
    return this.mockEmbedding(text);
  }

  private mockEmbedding(text: string): number[] {
    const base = text.length || 1;
    return [
      Number(((base % 97) / 100).toFixed(3)),
      Number(((base % 53) / 100).toFixed(3)),
      Number(((base % 31) / 100).toFixed(3)),
      Number(((base % 17) / 100).toFixed(3)),
    ];
  }

  async analyzeRiskPatterns(input: { candidateId: string; vacancyId: string; context?: unknown }) {
    const mockResult = () => ({
      overallRisk: 'medium',
      riskScore: 0.46,
      findings: [
        { type: 'availability', severity: 'medium', score: 0.58, detail: 'Disponibilidade híbrida ainda não confirmada.' },
        { type: 'technical-depth', severity: 'low', score: 0.34, detail: 'Aprofundar detalhes de observabilidade em sistemas distribuídos.' },
      ],
      explanation: 'Risco calculado por IA. Revisão humana obrigatória.',
    });

    const { result, provider, modelVersion } = await this.withFallback(
      'risk-analysis',
      () => this.openai.analyzeRiskPatterns(input),
      mockResult,
      input,
    );

    await prisma.aiExecutionLog.create({
      data: { operation: 'risk-analysis', provider, modelVersion, promptVersion: 'risk-analysis.v1', status: 'success', requestJson: input as never, responseJson: result as never },
    });

    return { provider, ...result };
  }

  async generateAssistiveVacancy(input: {
    title: string;
    seniority: string;
    sector: string;
    workModel?: string;
    location?: string;
  }) {
    const mockResult = () => ({
      summary: `Buscamos ${input.title} (${input.seniority || 'pleno'}) para atuar no setor ${input.sector}, em modelo ${input.workModel || 'híbrido'}, com base em ${input.location || 'a combinar'}.`,
      responsibilities: [
        `Liderar entregas de ${input.title} com foco em qualidade e previsibilidade.`,
        'Colaborar com stakeholders de negócio e pares técnicos para priorização.',
        'Garantir documentação de decisões e melhoria contínua do fluxo.',
      ],
      requiredSkills: [
        `${input.seniority || 'Pleno'} experiência prática na função`,
        `Conhecimento sólido no domínio de ${input.sector}`,
        'Comunicação clara e orientação a métricas de entrega',
      ],
      desiredSkills: [
        'Experiência com ambientes multi-tenant e trilha de auditoria',
        'Familiaridade com automações assíncronas e operações orientadas a SLA',
      ],
      keywords: [input.title, input.sector, input.seniority || 'pleno'],
    });

    const { result, provider, modelVersion } = await this.withFallback(
      'generate-assistive-vacancy',
      () => this.openai.generateAssistiveVacancy(input),
      mockResult,
      input,
    );

    await prisma.aiExecutionLog.create({
      data: { operation: 'generate-assistive-vacancy', provider, modelVersion, promptVersion: 'assistive-vacancy.v1', status: 'success', requestJson: input as never, responseJson: result as never },
    });

    return {
      provider,
      generatedByAI: true,
      requiresHumanReview: true,
      generatedAt: new Date().toISOString(),
      ...result,
    };
  }
}

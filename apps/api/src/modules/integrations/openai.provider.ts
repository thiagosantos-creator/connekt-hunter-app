import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

function safeJsonParse<T = unknown>(json: string, fallback: T, logger: Logger, context: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (err) {
    logger.warn(JSON.stringify({ event: 'json_parse_failed', context, error: String(err) }));
    return fallback;
  }
}

@Injectable()
export class OpenAiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.AI_PROVIDER_API_KEY ?? process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === '__REPLACE_ME__') {
        throw new Error('AI_PROVIDER_API_KEY or OPENAI_API_KEY is required for real AI provider');
      }
      const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? 30_000);
      this.client = new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 1 });
    }
    return this.client;
  }

  get modelVersion(): string {
    return process.env.AI_MODEL_VERSION ?? 'gpt-4o-mini';
  }

  async generateInterviewQuestions(input: {
    templateId: string;
    context: Record<string, unknown>;
  }): Promise<string[]> {
    const contextStr =
      typeof input.context === 'object' ? JSON.stringify(input.context) : String(input.context);

    const response = await this.getClient().chat.completions.create({
      model: this.modelVersion,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em recrutamento técnico. Gere perguntas de entrevista que avaliem competências técnicas e comportamentais do candidato.
Retorne EXCLUSIVAMENTE um JSON no formato: {"questions": ["pergunta1", "pergunta2", "pergunta3"]}
As perguntas devem ser em português do Brasil, abertas, que exijam exemplos práticos e sejam relevantes para a vaga.`,
        },
        {
          role: 'user',
          content: `Gere 3 perguntas de entrevista para a seguinte vaga:\n${contextStr}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<{ questions?: string[] }>(content, {}, this.logger, 'generateInterviewQuestions');

    this.logger.log(
      JSON.stringify({
        event: 'openai_generate_questions',
        templateId: input.templateId,
        questionsCount: parsed.questions?.length ?? 0,
        model: this.modelVersion,
        tokensUsed: response.usage?.total_tokens,
      }),
    );

    return parsed.questions ?? [];
  }

  async analyzeInterview(input: {
    sessionId: string;
    transcript: string;
  }): Promise<{
    summary: string;
    highlights: string[];
    risks: string[];
    evidence: string[];
    sentiment: { overall: string; confidence: number };
    recommendation: string;
  }> {
    const response = await this.getClient().chat.completions.create({
      model: this.modelVersion,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um analista sênior de entrevistas de emprego. Analise a transcrição abaixo e forneça uma análise estruturada.
Retorne EXCLUSIVAMENTE um JSON no formato:
{
  "summary": "resumo conciso da entrevista em 2-3 frases",
  "highlights": ["ponto forte 1", "ponto forte 2", ...],
  "risks": ["risco/preocupação 1", "risco 2", ...],
  "evidence": ["evidência concreta citada pelo candidato 1", ...],
  "sentiment": {"overall": "POSITIVE|NEGATIVE|NEUTRAL|MIXED", "confidence": 0.0-1.0},
  "recommendation": "recomendação assistiva clara para o recrutador"
}
Seja objetivo, factual e baseie-se apenas no que foi dito na transcrição. Esta é uma análise assistiva — a decisão final é sempre humana.`,
        },
        {
          role: 'user',
          content: `Transcrição da entrevista (sessão ${input.sessionId}):\n\n${input.transcript}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<{
      summary?: string;
      highlights?: string[];
      risks?: string[];
      evidence?: string[];
      sentiment?: { overall?: string; confidence?: number };
      recommendation?: string;
    }>(content, {}, this.logger, 'analyzeInterview');

    this.logger.log(
      JSON.stringify({
        event: 'openai_analyze_interview',
        sessionId: input.sessionId,
        model: this.modelVersion,
        tokensUsed: response.usage?.total_tokens,
      }),
    );

    return {
      summary: parsed.summary ?? 'Análise não disponível.',
      highlights: parsed.highlights ?? [],
      risks: parsed.risks ?? [],
      evidence: parsed.evidence ?? [],
      sentiment: {
        overall: parsed.sentiment?.overall ?? 'NEUTRAL',
        confidence: parsed.sentiment?.confidence ?? 0,
      },
      recommendation: parsed.recommendation ?? 'assistive_only',
    };
  }

  async explainMatching(input: {
    applicationId: string;
    score: number;
    dimensions: Array<{
      dimension: string;
      score: number;
      weight: number;
      reasoning: string;
    }>;
  }): Promise<{
    text: string;
    evidences: Array<{
      sourceType: string;
      sourceRef: string;
      excerpt: string;
      confidence: number;
    }>;
  }> {
    const dimensionsStr = input.dimensions
      .map((d) => `- ${d.dimension}: ${d.score}/100 (peso ${d.weight}) — ${d.reasoning}`)
      .join('\n');

    const response = await this.getClient().chat.completions.create({
      model: this.modelVersion,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em análise de aderência candidato-vaga. Explique o score de matching para um recrutador humano.
Retorne EXCLUSIVAMENTE um JSON:
{
  "text": "explicação clara e concisa do score em 2-3 frases",
  "evidences": [
    {"sourceType": "resume|interview|profile", "sourceRef": "referência", "excerpt": "evidência específica", "confidence": 0.0-1.0}
  ]
}
Seja factual e cite as dimensões com maior e menor aderência. Esta é uma explicação assistiva.`,
        },
        {
          role: 'user',
          content: `Aplicação: ${input.applicationId}\nScore geral: ${input.score}/100\n\nDimensões:\n${dimensionsStr}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<{
      text?: string;
      evidences?: Array<{
        sourceType?: string;
        sourceRef?: string;
        excerpt?: string;
        confidence?: number;
      }>;
    }>(content, {}, this.logger, 'explainMatching');

    return {
      text:
        parsed.text ??
        `Score ${input.score} — análise assistiva. Decisão final humana.`,
      evidences: (parsed.evidences ?? []).map((e) => ({
        sourceType: e.sourceType ?? 'resume',
        sourceRef: e.sourceRef ?? `application:${input.applicationId}`,
        excerpt: e.excerpt ?? '',
        confidence: e.confidence ?? 0.5,
      })),
    };
  }

  async generateCandidateInsights(input: {
    candidateId: string;
    vacancyId: string;
    matching: unknown;
    candidateContext?: unknown;
  }): Promise<{
    summary: string;
    strengths: string[];
    risks: string[];
    recommendations: string[];
    explanation: string;
  }> {
    // Build enriched context for the AI prompt
    const contextParts: string[] = [];
    contextParts.push(`Candidato ID: ${input.candidateId}`);
    contextParts.push(`Vaga ID: ${input.vacancyId}`);

    if (input.candidateContext && typeof input.candidateContext === 'object') {
      const ctx = input.candidateContext as Record<string, unknown>;
      if (ctx.fullName) contextParts.push(`Nome: ${ctx.fullName}`);
      if (ctx.resumeSummary) contextParts.push(`Resumo do CV: ${ctx.resumeSummary}`);
      if (Array.isArray(ctx.experience) && ctx.experience.length > 0) {
        contextParts.push(`Experiências: ${JSON.stringify(ctx.experience)}`);
      }
      if (Array.isArray(ctx.education) && ctx.education.length > 0) {
        contextParts.push(`Formação: ${JSON.stringify(ctx.education)}`);
      }
      if (Array.isArray(ctx.skills) && ctx.skills.length > 0) {
        contextParts.push(`Habilidades: ${(ctx.skills as string[]).join(', ')}`);
      }
      if (Array.isArray(ctx.languages) && ctx.languages.length > 0) {
        contextParts.push(`Idiomas: ${JSON.stringify(ctx.languages)}`);
      }
      if (ctx.introVideoSummary) contextParts.push(`Resumo do vídeo: ${ctx.introVideoSummary}`);
      if (Array.isArray(ctx.introVideoTags) && ctx.introVideoTags.length > 0) {
        contextParts.push(`Tags do vídeo: ${(ctx.introVideoTags as string[]).join(', ')}`);
      }
      if (ctx.vacancyTitle) contextParts.push(`Título da vaga: ${ctx.vacancyTitle}`);
      if (ctx.vacancyDescription) contextParts.push(`Descrição da vaga: ${ctx.vacancyDescription}`);
      if (Array.isArray(ctx.vacancyRequiredSkills) && ctx.vacancyRequiredSkills.length > 0) {
        contextParts.push(`Skills requeridas na vaga: ${(ctx.vacancyRequiredSkills as string[]).join(', ')}`);
      }
    }

    contextParts.push(`Dados de matching:\n${JSON.stringify(input.matching)}`);

    const response = await this.getClient().chat.completions.create({
      model: this.modelVersion,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um consultor sênior de RH especializado em análise de candidatos. Com base nos dados completos do candidato (experiência, formação, skills, idiomas, vídeo de apresentação) e nos requisitos da vaga, forneça insights acionáveis.
Retorne EXCLUSIVAMENTE um JSON:
{
  "summary": "resumo conciso de 2-3 frases sobre o candidato",
  "strengths": ["ponto forte 1", "ponto forte 2", ...],
  "risks": ["risco 1", "risco 2", ...],
  "recommendations": ["ação recomendada 1", "ação 2", ...],
  "explanation": "justificativa metodológica da análise"
}
Seja específico e acionável. Referencie dados concretos do perfil e CV do candidato. Esta é uma análise assistiva — a decisão final é sempre humana.`,
        },
        {
          role: 'user',
          content: contextParts.join('\n\n'),
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<{
      summary?: string;
      strengths?: string[];
      risks?: string[];
      recommendations?: string[];
      explanation?: string;
    }>(content, {}, this.logger, 'generateCandidateInsights');

    return {
      summary: parsed.summary ?? `Insights para candidato ${input.candidateId}.`,
      strengths: parsed.strengths ?? [],
      risks: parsed.risks ?? [],
      recommendations: parsed.recommendations ?? [],
      explanation: parsed.explanation ?? 'Análise assistiva por IA.',
    };
  }

  async compareCandidates(input: {
    vacancyId: string;
    left: { candidateId: string; score: number; context?: unknown };
    right: { candidateId: string; score: number; context?: unknown };
  }): Promise<{
    winnerHint: string;
    disclaimer: string;
    summary: string;
    dimensions: Array<{ dimension: string; leftAdvantage: boolean; detail: string }>;
  }> {
    const response = await this.getClient().chat.completions.create({
      model: this.modelVersion,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um analista de recrutamento. Compare dois candidatos para a mesma vaga.
Retorne EXCLUSIVAMENTE um JSON:
{
  "winnerHint": "candidateId do que tem melhor aderência",
  "disclaimer": "comparativo assistivo, decisão final humana",
  "summary": "resumo da comparação em 2-3 frases",
  "dimensions": [
    {"dimension": "nome da dimensão", "leftAdvantage": true/false, "detail": "detalhe"}
  ]
}`,
        },
        {
          role: 'user',
          content: `Vaga: ${input.vacancyId}\n\nCandidato A (${input.left.candidateId}): Score ${input.left.score}/100\nContexto: ${JSON.stringify(input.left.context ?? {})}\n\nCandidato B (${input.right.candidateId}): Score ${input.right.score}/100\nContexto: ${JSON.stringify(input.right.context ?? {})}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<{
      winnerHint?: string;
      disclaimer?: string;
      summary?: string;
      dimensions?: Array<{ dimension?: string; leftAdvantage?: boolean; detail?: string }>;
    }>(content, {}, this.logger, 'compareCandidates');

    return {
      winnerHint:
        parsed.winnerHint ??
        (input.left.score >= input.right.score ? input.left.candidateId : input.right.candidateId),
      disclaimer: parsed.disclaimer ?? 'Comparativo assistivo. Aprovação final é humana.',
      summary: parsed.summary ?? `Comparativo da vaga ${input.vacancyId}.`,
      dimensions: (parsed.dimensions ?? []).map((d) => ({
        dimension: d.dimension ?? '',
        leftAdvantage: d.leftAdvantage ?? false,
        detail: d.detail ?? '',
      })),
    };
  }

  async generateRankingRationale(input: {
    vacancyId: string;
    candidates: Array<{ candidateId: string; score: number }>;
  }): Promise<Record<string, string>> {
    const candidatesStr = input.candidates
      .map((c) => `- ${c.candidateId}: Score ${c.score}/100`)
      .join('\n');

    const response = await this.getClient().chat.completions.create({
      model: this.modelVersion,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um analista de ranking de candidatos. Justifique a posição de cada candidato.
Retorne EXCLUSIVAMENTE um JSON onde cada chave é um candidateId e o valor é uma justificativa concisa (1-2 frases) de por que o candidato está nessa posição do ranking. A decisão final é sempre humana.`,
        },
        {
          role: 'user',
          content: `Vaga: ${input.vacancyId}\n\nCandidatos (ordenados por score):\n${candidatesStr}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    return safeJsonParse<Record<string, string>>(content, {}, this.logger, 'generateRankingRationale');
  }

  async generateRecommendations(input: {
    candidateId: string;
    vacancyId: string;
    matchingScore?: number;
    riskScore?: number;
  }): Promise<{
    recommendations: Array<{
      type: string;
      title: string;
      confidence: number;
      actionableInsights: string[];
    }>;
    explanation: string;
  }> {
    const response = await this.getClient().chat.completions.create({
      model: this.modelVersion,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um consultor de recrutamento. Gere recomendações de próximos passos para um candidato.
Retorne EXCLUSIVAMENTE um JSON:
{
  "recommendations": [
    {"type": "next-step|stakeholder-check|technical-validation|culture-fit", "title": "título curto", "confidence": 0.0-1.0, "actionableInsights": ["insight acionável 1", ...]}
  ],
  "explanation": "justificativa geral das recomendações"
}
Seja específico e acionável. Recomendações assistivas — decisão final sempre humana.`,
        },
        {
          role: 'user',
          content: `Candidato: ${input.candidateId}\nVaga: ${input.vacancyId}\nScore de matching: ${input.matchingScore ?? 'N/A'}/100\nScore de risco: ${input.riskScore ?? 'N/A'}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<{
      recommendations?: Array<{
        type?: string;
        title?: string;
        confidence?: number;
        actionableInsights?: string[];
      }>;
      explanation?: string;
    }>(content, {}, this.logger, 'generateRecommendations');

    return {
      recommendations: (parsed.recommendations ?? []).map((r) => ({
        type: r.type ?? 'next-step',
        title: r.title ?? 'Próximo passo',
        confidence: r.confidence ?? 0.5,
        actionableInsights: r.actionableInsights ?? [],
      })),
      explanation: parsed.explanation ?? 'Recomendações assistivas por IA.',
    };
  }

  async analyzeRiskPatterns(input: {
    candidateId: string;
    vacancyId: string;
    context?: unknown;
  }): Promise<{
    overallRisk: string;
    riskScore: number;
    findings: Array<{
      type: string;
      severity: string;
      score: number;
      detail: string;
    }>;
    explanation: string;
  }> {
    const response = await this.getClient().chat.completions.create({
      model: this.modelVersion,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um analista de risco em recrutamento. Identifique padrões de risco na candidatura.
Retorne EXCLUSIVAMENTE um JSON:
{
  "overallRisk": "low|medium|high",
  "riskScore": 0.0-1.0,
  "findings": [
    {"type": "availability|technical-depth|culture-fit|experience-gap|stability", "severity": "low|medium|high", "score": 0.0-1.0, "detail": "descrição específica do risco"}
  ],
  "explanation": "justificativa geral da avaliação de risco"
}
Seja objetivo e factual. Análise assistiva — revisão humana obrigatória.`,
        },
        {
          role: 'user',
          content: `Candidato: ${input.candidateId}\nVaga: ${input.vacancyId}\nContexto:\n${JSON.stringify(input.context ?? {})}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<{
      overallRisk?: string;
      riskScore?: number;
      findings?: Array<{
        type?: string;
        severity?: string;
        score?: number;
        detail?: string;
      }>;
      explanation?: string;
    }>(content, {}, this.logger, 'analyzeRiskPatterns');

    return {
      overallRisk: parsed.overallRisk ?? 'medium',
      riskScore: parsed.riskScore ?? 0.5,
      findings: (parsed.findings ?? []).map((f) => ({
        type: f.type ?? 'unknown',
        severity: f.severity ?? 'medium',
        score: f.score ?? 0.5,
        detail: f.detail ?? '',
      })),
      explanation: parsed.explanation ?? 'Risco calculado por IA. Revisão humana obrigatória.',
    };
  }

  async generateAssistiveVacancy(input: {
    title: string;
    seniority: string;
    sector: string;
    workModel?: string;
    location?: string;
  }): Promise<{
    summary: string;
    responsibilities: string[];
    requiredSkills: string[];
    desiredSkills: string[];
    keywords: string[];
  }> {
    const response = await this.getClient().chat.completions.create({
      model: this.modelVersion,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um Recrutador Especialista redigindo o modelo de uma vaga de emprego.
Retorne EXCLUSIVAMENTE um JSON:
{
  "summary": "resumo engajador da vaga em 3 frases",
  "responsibilities": ["ação prática 1", "ação 2", "ação 3", "ação 4"],
  "requiredSkills": ["habilidade 1", "habilidade 2"],
  "desiredSkills": ["habilidade desejável 1", "habilidade desejável 2"],
  "keywords": ["tag1", "tag2"]
}
Seja atrativo, claro e direto ao ponto. Use a língua portuguesa do Brasil.`,
        },
        {
          role: 'user',
          content: `Crie o conteúdo para a seguinte vaga:\nTítulo: ${input.title}\nSenioridade: ${input.seniority}\nSetor: ${input.sector}\nModalidade: ${input.workModel ?? 'não definido'}\nLocalização: ${input.location ?? 'não definido'}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<{
      summary?: string;
      responsibilities?: string[];
      requiredSkills?: string[];
      desiredSkills?: string[];
      keywords?: string[];
    }>(content, {}, this.logger, 'generateAssistiveVacancy');

    return {
      summary: parsed.summary ?? `Buscamos ${input.title} para integrar nosso time.`,
      responsibilities: parsed.responsibilities ?? [],
      requiredSkills: parsed.requiredSkills ?? [],
      desiredSkills: parsed.desiredSkills ?? [],
      keywords: parsed.keywords ?? [input.title],
    };
  }

  async parseResume(input: {
    resumeText: string;
    objectKey: string;
    candidateId: string;
  }): Promise<{
    experience: Array<{ company: string; role: string; period?: string; confidence: number }>;
    education: Array<{
      institution: string;
      degree: string;
      field?: string;
      confidence: number;
    }>;
    skills: Array<{ name: string; level?: string; confidence: number }>;
    languages: Array<{ name: string; level: string; confidence: number }>;
    location: { city?: string; state?: string; country?: string; confidence: number };
    summary: string;
    fullName?: string;
    phone?: string;
    keywords: string[];
  }> {
    const response = await this.getClient().chat.completions.create({
      model: this.modelVersion,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um parser especializado em currículos profissionais. Sua tarefa é extrair e estruturar informações de currículos técnicos e executivos.
Retorne EXCLUSIVAMENTE um JSON válido no formato abaixo:
{
  "fullName": "nome completo do candidato",
  "phone": "telefone de contato",
  "experience": [{"company": "nome da empresa", "role": "cargo", "period": "período (ex: Jan 2020 - Jan 2022 ou Atual)", "confidence": 0.0-1.0}],
  "education": [{"institution": "nome da instituição", "degree": "grau (ex: Bacharelado, Mestrado)", "field": "área de estudo", "confidence": 0.0-1.0}],
  "skills": [{"name": "nome da habilidade", "level": "junior|mid|senior|expert", "confidence": 0.0-1.0}],
  "languages": [{"name": "idioma", "level": "Nativo|Fluente|Avançado|Intermediário|Básico", "confidence": 0.0-1.0}],
  "location": {"city": "cidade", "state": "estado", "country": "país", "confidence": 0.0-1.0},
  "summary": "resumo profissional em 2-3 frases, focado em conquistas e perfil técnico",
  "keywords": ["tag1", "tag2", "tag3"]
}
Regras:
1. Extraia o máximo de detalhes possível, mas mantenha a fidelidade ao texto original.
2. Identifique o nível das habilidades (skills) com base no contexto das experiências.
3. Se uma informação não for encontrada, retorne null ou array vazio conforme apropriado.
4. "keywords" devem ser termos curtos que resumem a stack tecnológica ou áreas de domínio.
5. Atribua confidence menor (ex: 0.4-0.6) quando a extração for baseada em inferência ou texto ambíguo.`,
        },
        {
          role: 'user',
          content: `Currículo do candidato:\n\n${input.resumeText}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = safeJsonParse<{
      fullName?: string;
      phone?: string;
      experience?: Array<{
        company?: string;
        role?: string;
        period?: string;
        confidence?: number;
      }>;
      education?: Array<{
        institution?: string;
        degree?: string;
        field?: string;
        confidence?: number;
      }>;
      skills?: Array<{ name?: string; level?: string; confidence?: number }>;
      languages?: Array<{ name?: string; level?: string; confidence?: number }>;
      location?: {
        city?: string;
        state?: string;
        country?: string;
        confidence?: number;
      };
      summary?: string;
      keywords?: string[];
    }>(content, {}, this.logger, 'parseResume');

    this.logger.log(
      JSON.stringify({
        event: 'openai_parse_resume',
        candidateId: input.candidateId,
        model: this.modelVersion,
        tokensUsed: response.usage?.total_tokens,
      }),
    );

    return {
      fullName: parsed.fullName,
      phone: parsed.phone,
      experience: (parsed.experience ?? []).map((e) => ({
        company: e.company ?? '',
        role: e.role ?? '',
        period: e.period,
        confidence: e.confidence ?? 0.5,
      })),
      education: (parsed.education ?? []).map((e) => ({
        institution: e.institution ?? '',
        degree: e.degree ?? '',
        field: e.field,
        confidence: e.confidence ?? 0.5,
      })),
      skills: (parsed.skills ?? []).map((s) => ({
        name: s.name ?? '',
        level: s.level,
        confidence: s.confidence ?? 0.5,
      })),
      languages: (parsed.languages ?? []).map((l) => ({
        name: l.name ?? '',
        level: l.level ?? 'Básico',
        confidence: l.confidence ?? 0.5,
      })),
      location: {
        city: parsed.location?.city,
        state: parsed.location?.state,
        country: parsed.location?.country,
        confidence: parsed.location?.confidence ?? 0.5,
      },
      summary: parsed.summary ?? '',
      keywords: parsed.keywords ?? [],
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
    const response = await this.getClient().embeddings.create({
      model,
      input: text.slice(0, 8191),
    });
    return response.data[0].embedding;
  }
}

import { prisma } from '@connekt/db';
import { withWorkerSpan } from './telemetry.js';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  type LanguageCode as TranscribeLanguageCode,
} from '@aws-sdk/client-transcribe';
import {
  ComprehendClient,
  DetectSentimentCommand,
  DetectKeyPhrasesCommand,
  DetectEntitiesCommand,
  type LanguageCode as ComprehendLanguageCode,
} from '@aws-sdk/client-comprehend';
import OpenAI from 'openai';

function isTranscriptionReal(): boolean {
  return process.env.FF_TRANSCRIPTION_REAL === 'true';
}

function isAiReal(): boolean {
  return process.env.FF_AI_REAL === 'true';
}

function isCvParserReal(): boolean {
  return process.env.FF_CV_PARSER_REAL === 'true';
}

function shouldFallbackToMock(key: string): boolean {
  const envKey = `${key.toUpperCase().replace(/-/g, '_')}_FALLBACK_TO_MOCK`;
  return process.env[envKey] !== 'false';
}

function getOpenAiClient(): OpenAI | null {
  const apiKey = process.env.AI_PROVIDER_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === '__REPLACE_ME__') return null;
  return new OpenAI({ apiKey });
}

function getModelVersion(): string {
  return process.env.AI_MODEL_VERSION ?? 'gpt-4.1-mini';
}

function safeJsonParse<T = unknown>(json: string, fallback: T, context: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', source: 'worker', event: 'json_parse_failed', context, error: String(err) }));
    return fallback;
  }
}

/** Detect media format from object key extension. Defaults to webm. */
function detectMediaFormat(objectKey: string): string {
  const lower = objectKey.toLowerCase();
  if (lower.endsWith('.mp3')) return 'mp3';
  if (lower.endsWith('.mp4')) return 'mp4';
  if (lower.endsWith('.wav')) return 'wav';
  if (lower.endsWith('.flac')) return 'flac';
  if (lower.endsWith('.ogg')) return 'ogg';
  if (lower.endsWith('.amr')) return 'amr';
  if (lower.endsWith('.webm')) return 'webm';
  return 'webm';
}

async function safeProcess(label: string, eventId: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await withWorkerSpan('worker.process_event', { topic: label, eventId }, fn);
    return true;
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', source: 'worker', event: 'process_event_failed', topic: label, eventId, error: String(err) }));
    return false;
  }
}

async function assertWorkerTenantConsistency(
  candidateId: string,
  vacancyId: string,
  topic: string,
  eventId: string,
): Promise<string> {
  const [candidate, vacancy] = await Promise.all([
    prisma.candidate.findUnique({ where: { id: candidateId } }),
    prisma.vacancy.findUnique({ where: { id: vacancyId } }),
  ]);

  if (!candidate || !vacancy) {
    throw new Error(`[${topic}] missing entity: candidateId=${candidateId} vacancyId=${vacancyId} eventId=${eventId}`);
  }

  if (candidate.organizationId !== vacancy.organizationId) {
    console.error(
      JSON.stringify({
        level: 'error',
        source: 'worker',
        event: 'cross_tenant_rejected',
        topic,
        eventId,
        candidateOrg: candidate.organizationId,
        vacancyOrg: vacancy.organizationId,
      }),
    );
    throw new Error(`[${topic}] cross-tenant mismatch rejected: candidateOrg=${candidate.organizationId} vacancyOrg=${vacancy.organizationId} eventId=${eventId}`);
  }

  return vacancy.organizationId;
}

export async function processResumeUploads(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({
    where: { topic: 'resume.uploaded', processed: false },
    take: 10,
  });

  let processed = 0;
  for (const evt of events) {
    const payload = evt.payload as { resumeId: string; candidateId?: string; objectKey?: string; resumeText?: string };
    const ok = await safeProcess('resume.uploaded', evt.id, async () => {
      const existing = await prisma.resumeParseResult.findUnique({
        where: { resumeId: payload.resumeId },
      });

      // If already parsed with real data, skip
      if (existing && existing.status === 'completed') {
        await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
        return;
      }

      // Ensure pending record exists
      if (!existing) {
        await prisma.resumeParseResult.create({
          data: {
            resumeId: payload.resumeId,
            status: 'processing',
            parsedJson: { info: 'resume_parse_processing' } as never,
          },
        });
      } else {
        await prisma.resumeParseResult.update({
          where: { resumeId: payload.resumeId },
          data: { status: 'processing' },
        });
      }

      let parsedJson: Record<string, unknown> = { info: 'resume_parse_pending' };
      let provider = 'cv-parser-mock';

      if (isCvParserReal()) {
        const openai = getOpenAiClient();
        if (openai && payload.resumeText?.trim()) {
          try {
            const response = await openai.chat.completions.create({
              model: getModelVersion(),
              temperature: 0.1,
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content: `Você é um parser especializado em currículos. Extraia informações estruturadas do currículo abaixo.
Retorne EXCLUSIVAMENTE um JSON:
{
  "experience": [{"company": "nome", "role": "cargo", "period": "período", "confidence": 0.0-1.0}],
  "education": [{"institution": "nome", "degree": "grau", "field": "área", "confidence": 0.0-1.0}],
  "skills": [{"name": "habilidade", "level": "junior|mid|senior|expert", "confidence": 0.0-1.0}],
  "languages": [{"name": "idioma", "level": "Nativo|Fluente|Avançado|Intermediário|Básico", "confidence": 0.0-1.0}],
  "location": {"city": "cidade", "state": "estado", "country": "país", "confidence": 0.0-1.0},
  "summary": "resumo profissional em 2-3 frases"
}
Seja preciso com os dados extraídos. Atribua confidence menor quando a informação for ambígua.`,
                },
                {
                  role: 'user',
                  content: `Currículo do candidato:\n\n${payload.resumeText}`,
                },
              ],
            });

            const content = response.choices[0]?.message?.content ?? '{}';
            parsedJson = safeJsonParse(content, {}, 'resume_parse');
            provider = 'cv-parser-real';

            console.log(JSON.stringify({ source: 'worker', event: 'resume_parse_real_completed', resumeId: payload.resumeId, tokensUsed: response.usage?.total_tokens }));
          } catch (err) {
            console.error(JSON.stringify({ source: 'worker', event: 'resume_parse_real_failed', resumeId: payload.resumeId, error: String(err) }));
            if (!shouldFallbackToMock('cv-parser')) throw err;
          }
        }
      }

      // If still mock, use hardcoded data
      if (provider === 'cv-parser-mock') {
        parsedJson = {
          experience: [{ company: 'Empresa Exemplo', role: 'Software Engineer', confidence: 0.78 }],
          education: [{ institution: 'Universidade Exemplo', degree: 'BSc', confidence: 0.74 }],
          skills: [{ name: 'TypeScript', confidence: 0.88 }],
          languages: [{ name: 'Português', level: 'Nativo', confidence: 0.9 }],
          location: { city: 'São Paulo', confidence: 0.66 },
          metadata: { provider, objectKey: payload.objectKey ?? '' },
        };
      }

      await prisma.resumeParseResult.update({
        where: { resumeId: payload.resumeId },
        data: {
          status: 'completed',
          parsedJson: parsedJson as never,
        },
      });

      // Update resume parse metadata
      await prisma.resumeParseMetadata.upsert({
        where: { resumeId: payload.resumeId },
        update: { provider, status: 'parsed', confidenceJson: parsedJson as never },
        create: { resumeId: payload.resumeId, provider, status: 'parsed', confidenceJson: parsedJson as never },
      });

      await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
    });
    if (ok) processed++;
  }

  return processed;
}

export async function processSmartInterviewVideoJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({
    where: { topic: 'smart-interview.video-uploaded', processed: false },
    take: 20,
  });

  let processed = 0;
  for (const evt of events) {
    const payload = evt.payload as { answerId: string; sessionId: string };
    const ok = await safeProcess('smart-interview.video-uploaded', evt.id, async () => {
      let transcriptContent = 'Transcrição mock gerada pelo worker.';
      let language = 'pt-BR';
      let provider = 'transcription-mock';

      if (isTranscriptionReal()) {
        try {
          const answer = await prisma.smartInterviewAnswer.findUnique({ where: { id: payload.answerId } });
          if (answer?.objectKey) {
            const bucket = process.env.S3_BUCKET ?? 'connekt-staging-assets';
            const region = process.env.AWS_TRANSCRIBE_REGION ?? process.env.S3_REGION ?? 'us-east-1';
            const mediaUri = `s3://${bucket}/${answer.objectKey}`;
            const jobName = `connekt-${payload.answerId}-${Date.now()}`;
            const mediaFormat = detectMediaFormat(answer.objectKey);

            const transcribeClient = new TranscribeClient({ region });

            await transcribeClient.send(new StartTranscriptionJobCommand({
              TranscriptionJobName: jobName,
              LanguageCode: 'pt-BR' as TranscribeLanguageCode,
              MediaFormat: mediaFormat,
              Media: { MediaFileUri: mediaUri },
              OutputBucketName: bucket,
              OutputKey: `transcriptions/${jobName}.json`,
            }));

            // Poll until complete
            let jobStatus = 'IN_PROGRESS';
            let transcriptUri = '';
            for (let i = 0; i < 60; i++) {
              await new Promise((r) => setTimeout(r, 5000));
              const result = await transcribeClient.send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }));
              const job = result.TranscriptionJob;
              jobStatus = job?.TranscriptionJobStatus ?? 'FAILED';
              if (jobStatus === 'COMPLETED') {
                transcriptUri = job?.Transcript?.TranscriptFileUri ?? '';
                language = job?.LanguageCode ?? 'pt-BR';
                break;
              }
              if (jobStatus === 'FAILED') {
                throw new Error(`Transcribe job failed: ${job?.FailureReason ?? 'unknown'}`);
              }
            }

            if (jobStatus !== 'COMPLETED') {
              throw new Error(`Transcribe job timed out after 60 polling attempts`);
            }

            if (transcriptUri) {
              try {
                const response = await fetch(transcriptUri);
                if (!response.ok) {
                  throw new Error(`Failed to fetch transcript: HTTP ${response.status}`);
                }
                const data = (await response.json()) as { results?: { transcripts?: Array<{ transcript?: string }> } };
                transcriptContent = data.results?.transcripts?.map((t) => t.transcript).join(' ') ?? '';
                provider = 'aws-transcribe';
              } catch (fetchErr) {
                console.error(JSON.stringify({ source: 'worker', event: 'transcription_fetch_failed', answerId: payload.answerId, error: String(fetchErr) }));
                throw fetchErr;
              }

              console.log(JSON.stringify({ source: 'worker', event: 'transcription_real_completed', answerId: payload.answerId, jobName, transcriptLength: transcriptContent.length }));
            }
          }
        } catch (err) {
          console.error(JSON.stringify({ source: 'worker', event: 'transcription_real_failed', answerId: payload.answerId, error: String(err) }));
          if (!shouldFallbackToMock('transcription')) throw err;
          console.log(JSON.stringify({ source: 'worker', event: 'transcription_fallback_to_mock', answerId: payload.answerId }));
        }
      }

      await prisma.smartInterviewTranscript.upsert({
        where: { answerId: payload.answerId },
        update: { status: 'completed', content: transcriptContent, language },
        create: { answerId: payload.answerId, status: 'completed', content: transcriptContent, language },
      });

      await prisma.transcriptMetadata.upsert({
        where: { answerId: payload.answerId },
        update: { provider, status: 'completed', processedAt: new Date() },
        create: { answerId: payload.answerId, provider, status: 'completed', processedAt: new Date() },
      });

      await prisma.smartInterviewAnswer.update({
        where: { id: payload.answerId },
        data: { status: 'transcribed', processedAt: new Date() },
      });

      await prisma.outboxEvent.create({
        data: { topic: 'smart-interview.transcribed', payload: { sessionId: payload.sessionId, answerId: payload.answerId } },
      });

      await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
    });
    if (ok) processed++;
  }

  return processed;
}

export async function processSmartInterviewAnalysisJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({
    where: { topic: 'smart-interview.transcribed', processed: false },
    take: 20,
  });

  let processed = 0;
  for (const evt of events) {
    const payload = evt.payload as { sessionId: string; answerId: string };
    const ok = await safeProcess('smart-interview.transcribed', evt.id, async () => {
      let summary = 'Análise mock: comunicação clara e exemplos práticos relevantes.';
      let highlights: string[] = ['clareza', 'objetividade'];
      let risks: string[] = ['aprofundar detalhes técnicos'];
      let evidence: string[] = [];
      let sentimentJson: Record<string, unknown> | null = null;
      let entitiesJson: Array<Record<string, unknown>> | null = null;
      let keyPhrasesJson: Array<Record<string, unknown>> | null = null;
      let provider = 'ai-mock';
      let modelVersion = 'mock-v1';

      // Fetch transcript text for enrichment
      const transcripts = await prisma.smartInterviewTranscript.findMany({
        where: { answer: { sessionId: payload.sessionId } },
      });
      const transcriptText = transcripts.map((t) => t.content).join('\n').trim();

      // Run AWS Comprehend for sentiment analysis when enabled
      if (isAiReal() && transcriptText && transcriptText !== 'Transcrição mock gerada pelo worker.') {
        try {
          const comprehendRegion = process.env.AWS_COMPREHEND_REGION ?? process.env.S3_REGION ?? 'us-east-1';
          const comprehendClient = new ComprehendClient({ region: comprehendRegion });
          const truncated = transcriptText.slice(0, 5000);

          const [sentimentResult, keyPhrasesResult, entitiesResult] = await Promise.all([
            comprehendClient.send(new DetectSentimentCommand({ Text: truncated, LanguageCode: 'pt' as ComprehendLanguageCode })),
            comprehendClient.send(new DetectKeyPhrasesCommand({ Text: truncated, LanguageCode: 'pt' as ComprehendLanguageCode })),
            comprehendClient.send(new DetectEntitiesCommand({ Text: truncated, LanguageCode: 'pt' as ComprehendLanguageCode })),
          ]);

          sentimentJson = {
            sentiment: sentimentResult.Sentiment ?? 'NEUTRAL',
            scores: {
              positive: sentimentResult.SentimentScore?.Positive ?? 0,
              negative: sentimentResult.SentimentScore?.Negative ?? 0,
              neutral: sentimentResult.SentimentScore?.Neutral ?? 0,
              mixed: sentimentResult.SentimentScore?.Mixed ?? 0,
            },
          };

          keyPhrasesJson = (keyPhrasesResult.KeyPhrases ?? []).map((p) => ({
            text: p.Text ?? '',
            score: p.Score ?? 0,
            beginOffset: p.BeginOffset ?? 0,
            endOffset: p.EndOffset ?? 0,
          }));

          entitiesJson = (entitiesResult.Entities ?? []).map((e) => ({
            text: e.Text ?? '',
            type: e.Type ?? 'OTHER',
            score: e.Score ?? 0,
            beginOffset: e.BeginOffset ?? 0,
            endOffset: e.EndOffset ?? 0,
          }));

          provider = 'aws-comprehend+ai';
          modelVersion = process.env.AI_MODEL_VERSION ?? 'gpt-4.1-mini';

          console.log(JSON.stringify({
            source: 'worker',
            event: 'comprehend_analysis_completed',
            sessionId: payload.sessionId,
            sentiment: sentimentJson.sentiment,
            keyPhrasesCount: keyPhrasesJson.length,
            entitiesCount: entitiesJson.length,
          }));
        } catch (err) {
          console.error(JSON.stringify({ source: 'worker', event: 'comprehend_analysis_failed', sessionId: payload.sessionId, error: String(err) }));
          if (!shouldFallbackToMock('ai')) throw err;
        }
      }

      await prisma.smartInterviewAiAnalysis.upsert({
        where: { sessionId: payload.sessionId },
        update: {
          status: 'completed',
          summary,
          highlights: highlights as never,
          risks: risks as never,
          evidence: evidence as never,
          sentimentJson: sentimentJson as never,
          entitiesJson: entitiesJson as never,
          keyPhrasesJson: keyPhrasesJson as never,
          provider,
          modelVersion,
        },
        create: {
          sessionId: payload.sessionId,
          status: 'completed',
          summary,
          highlights: highlights as never,
          risks: risks as never,
          evidence: evidence as never,
          sentimentJson: sentimentJson as never,
          entitiesJson: entitiesJson as never,
          keyPhrasesJson: keyPhrasesJson as never,
          provider,
          modelVersion,
        },
      });

      await prisma.smartInterviewAnswer.update({
        where: { id: payload.answerId },
        data: { status: 'analyzed', processedAt: new Date() },
      });

      await prisma.smartInterviewSession.update({
        where: { id: payload.sessionId },
        data: { status: 'awaiting_human_review' },
      });

      await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
    });
    if (ok) processed++;
  }

  return processed;
}



export async function processMatchingComputeJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({ where: { topic: 'matching:compute', processed: false }, take: 20 });

  let processed = 0;
  for (const evt of events) {
    const payload = evt.payload as { applicationId: string; candidateId: string; vacancyId: string };
    const ok = await safeProcess('matching:compute', evt.id, async () => {
      const tenantId = await assertWorkerTenantConsistency(payload.candidateId, payload.vacancyId, 'matching:compute', evt.id);
      console.log(JSON.stringify({ source: 'worker', event: 'matching_compute_start', eventId: evt.id, tenantId, candidateId: payload.candidateId, vacancyId: payload.vacancyId }));

      let score = 50;
      let dimensions: Array<{ dimension: string; score: number; weight: number; reasoning: string }> = [];
      let modelVersion = 'matching-v1-worker';

      if (isAiReal()) {
        const openai = getOpenAiClient();
        if (openai) {
          try {
            // Gather context: candidate profile, vacancy, resume parse
            const [candidate, vacancy, resumeParse] = await Promise.all([
              prisma.candidate.findUnique({ where: { id: payload.candidateId }, include: { profile: true } }),
              prisma.vacancy.findUnique({ where: { id: payload.vacancyId } }),
              prisma.resumeParseResult.findFirst({ where: { resume: { candidateId: payload.candidateId } } }),
            ]);

            const candidateContext = {
              name: candidate?.profile?.fullName ?? 'N/A',
              skills: resumeParse?.parsedJson ? (resumeParse.parsedJson as Record<string, unknown>).skills : [],
              experience: resumeParse?.parsedJson ? (resumeParse.parsedJson as Record<string, unknown>).experience : [],
            };

            const vacancyContext = {
              title: vacancy?.title ?? 'N/A',
              description: vacancy?.description ?? '',
              requiredSkills: vacancy?.requiredSkills ?? [],
            };

            const response = await openai.chat.completions.create({
              model: getModelVersion(),
              temperature: 0.3,
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content: `Você é um especialista em matching candidato-vaga. Avalie a aderência do candidato à vaga.
Retorne EXCLUSIVAMENTE um JSON:
{
  "score": 0-100,
  "dimensions": [
    {"dimension": "technical_skills", "score": 0-100, "weight": 0.3, "reasoning": "justificativa"},
    {"dimension": "experience", "score": 0-100, "weight": 0.25, "reasoning": "justificativa"},
    {"dimension": "education", "score": 0-100, "weight": 0.15, "reasoning": "justificativa"},
    {"dimension": "culture_fit", "score": 0-100, "weight": 0.15, "reasoning": "justificativa"},
    {"dimension": "communication", "score": 0-100, "weight": 0.15, "reasoning": "justificativa"}
  ]
}
Score final deve ser a média ponderada das dimensões. Análise assistiva — decisão final humana.`,
                },
                {
                  role: 'user',
                  content: `Candidato:\n${JSON.stringify(candidateContext)}\n\nVaga:\n${JSON.stringify(vacancyContext)}`,
                },
              ],
            });

            const content = response.choices[0]?.message?.content ?? '{}';
            const parsed = safeJsonParse<{
              score?: number;
              dimensions?: Array<{ dimension?: string; score?: number; weight?: number; reasoning?: string }>;
            }>(content, {}, 'matching_compute');

            score = parsed.score ?? 50;
            dimensions = (parsed.dimensions ?? []).map((d) => ({
              dimension: d.dimension ?? 'unknown',
              score: d.score ?? 50,
              weight: d.weight ?? 0.2,
              reasoning: d.reasoning ?? '',
            }));
            modelVersion = getModelVersion();

            console.log(JSON.stringify({ source: 'worker', event: 'matching_compute_real_completed', eventId: evt.id, score, dimensionsCount: dimensions.length, tokensUsed: response.usage?.total_tokens }));
          } catch (err) {
            console.error(JSON.stringify({ source: 'worker', event: 'matching_compute_real_failed', eventId: evt.id, error: String(err) }));
            if (!shouldFallbackToMock('ai')) throw err;
          }
        }
      }

      await prisma.matchingScore.upsert({
        where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } },
        update: { score, computedAt: new Date(), modelVersion, dimensions: dimensions as never },
        create: { candidateId: payload.candidateId, vacancyId: payload.vacancyId, score, modelVersion, dimensions: dimensions as never },
      });

      await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
    });
    if (ok) processed++;
  }

  return processed;
}

export async function processInsightsGenerateJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({ where: { topic: 'insights:generate', processed: false }, take: 20 });

  let processed = 0;
  for (const evt of events) {
    const payload = evt.payload as { candidateId: string; vacancyId: string };
    const ok = await safeProcess('insights:generate', evt.id, async () => {
      const tenantId = await assertWorkerTenantConsistency(payload.candidateId, payload.vacancyId, 'insights:generate', evt.id);
      console.log(JSON.stringify({ source: 'worker', event: 'insights_generate_start', eventId: evt.id, tenantId, candidateId: payload.candidateId, vacancyId: payload.vacancyId }));

      let summary = 'Insight reprocessado via worker';
      let strengths: string[] = ['consistência de sinais'];
      let risks: string[] = ['necessário validar contexto'];
      let recommendations: string[] = ['review humano obrigatório'];

      if (isAiReal()) {
        const openai = getOpenAiClient();
        if (openai) {
          try {
            const matchingScore = await prisma.matchingScore.findUnique({
              where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } },
            });

            const response = await openai.chat.completions.create({
              model: getModelVersion(),
              temperature: 0.4,
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content: `Você é um consultor sênior de RH. Com base nos dados de matching, forneça insights acionáveis.
Retorne EXCLUSIVAMENTE um JSON:
{
  "summary": "resumo conciso de 2-3 frases",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "risks": ["risco 1", "risco 2"],
  "recommendations": ["ação recomendada 1", "ação 2"]
}
Seja específico e acionável. Análise assistiva — decisão final humana.`,
                },
                {
                  role: 'user',
                  content: `Candidato: ${payload.candidateId}\nVaga: ${payload.vacancyId}\nDados de matching:\n${JSON.stringify(matchingScore ?? { score: 50 })}`,
                },
              ],
            });

            const content = response.choices[0]?.message?.content ?? '{}';
            const parsed = safeJsonParse<{
              summary?: string;
              strengths?: string[];
              risks?: string[];
              recommendations?: string[];
            }>(content, {}, 'insights_generate');

            summary = parsed.summary ?? summary;
            strengths = parsed.strengths ?? strengths;
            risks = parsed.risks ?? risks;
            recommendations = parsed.recommendations ?? recommendations;

            console.log(JSON.stringify({ source: 'worker', event: 'insights_generate_real_completed', eventId: evt.id, tokensUsed: response.usage?.total_tokens }));
          } catch (err) {
            console.error(JSON.stringify({ source: 'worker', event: 'insights_generate_real_failed', eventId: evt.id, error: String(err) }));
            if (!shouldFallbackToMock('ai')) throw err;
          }
        }
      }

      await prisma.candidateInsight.upsert({
        where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } },
        update: { summary, strengths: strengths as never, risks: risks as never, recommendations: recommendations as never },
        create: { candidateId: payload.candidateId, vacancyId: payload.vacancyId, summary, strengths: strengths as never, risks: risks as never, recommendations: recommendations as never },
      });
      await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
    });
    if (ok) processed++;
  }

  return processed;
}

export async function processComparisonGenerateJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({ where: { topic: 'comparison:generate', processed: false }, take: 20 });

  let processed = 0;
  for (const evt of events) {
    const payload = evt.payload as { vacancyId: string; leftCandidateId: string; rightCandidateId: string };
    const ok = await safeProcess('comparison:generate', evt.id, async () => {
      const vacancy = await prisma.vacancy.findUnique({ where: { id: payload.vacancyId } });
      if (!vacancy) throw new Error(`[comparison:generate] vacancy not found: ${payload.vacancyId} eventId=${evt.id}`);
      console.log(JSON.stringify({ source: 'worker', event: 'comparison_generate_start', eventId: evt.id, tenantId: vacancy.organizationId, vacancyId: payload.vacancyId }));

      let comparisonJson: Record<string, unknown> = { generatedBy: 'worker', disclaimer: 'assistive-only' };

      if (isAiReal()) {
        const openai = getOpenAiClient();
        if (openai) {
          try {
            const [leftScore, rightScore] = await Promise.all([
              prisma.matchingScore.findUnique({ where: { candidateId_vacancyId: { candidateId: payload.leftCandidateId, vacancyId: payload.vacancyId } } }),
              prisma.matchingScore.findUnique({ where: { candidateId_vacancyId: { candidateId: payload.rightCandidateId, vacancyId: payload.vacancyId } } }),
            ]);

            const response = await openai.chat.completions.create({
              model: getModelVersion(),
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
    {"dimension": "nome", "leftAdvantage": true/false, "detail": "detalhe"}
  ]
}`,
                },
                {
                  role: 'user',
                  content: `Vaga: ${payload.vacancyId} (${vacancy.title ?? ''})\n\nCandidato A (${payload.leftCandidateId}): Score ${leftScore?.score ?? 'N/A'}/100\nDimensões: ${JSON.stringify(leftScore?.dimensions ?? {})}\n\nCandidato B (${payload.rightCandidateId}): Score ${rightScore?.score ?? 'N/A'}/100\nDimensões: ${JSON.stringify(rightScore?.dimensions ?? {})}`,
                },
              ],
            });

            const content = response.choices[0]?.message?.content ?? '{}';
            comparisonJson = safeJsonParse(content, comparisonJson, 'comparison_generate');
            comparisonJson.generatedBy = 'ai';
            comparisonJson.modelVersion = getModelVersion();

            console.log(JSON.stringify({ source: 'worker', event: 'comparison_generate_real_completed', eventId: evt.id, tokensUsed: response.usage?.total_tokens }));
          } catch (err) {
            console.error(JSON.stringify({ source: 'worker', event: 'comparison_generate_real_failed', eventId: evt.id, error: String(err) }));
            if (!shouldFallbackToMock('ai')) throw err;
          }
        }
      }

      await prisma.candidateComparison.upsert({
        where: { vacancyId_leftCandidateId_rightCandidateId: { vacancyId: payload.vacancyId, leftCandidateId: payload.leftCandidateId, rightCandidateId: payload.rightCandidateId } },
        update: { comparisonJson: comparisonJson as never },
        create: { vacancyId: payload.vacancyId, leftCandidateId: payload.leftCandidateId, rightCandidateId: payload.rightCandidateId, comparisonJson: comparisonJson as never },
      });
      await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
    });
    if (ok) processed++;
  }

  return processed;
}

export async function processRecommendationGenerateJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({ where: { topic: 'recommendation:generate', processed: false }, take: 20 });
  let processed = 0;
  for (const evt of events) {
    const payload = evt.payload as { candidateId: string; vacancyId: string };
    const ok = await safeProcess('recommendation:generate', evt.id, async () => {
      const tenantId = await assertWorkerTenantConsistency(payload.candidateId, payload.vacancyId, 'recommendation:generate', evt.id);
      console.log(JSON.stringify({ source: 'worker', event: 'recommendation_generate_start', eventId: evt.id, tenantId, candidateId: payload.candidateId, vacancyId: payload.vacancyId }));

      let title = 'Recomendação reprocessada';
      let explanation = 'Reprocessamento assistivo via worker; decisão final permanece humana.';
      let confidence = 0.65;
      let actionableInsights: string[] = ['revisar aderência com gestor'];
      let recommendationType = 'worker-refresh';

      if (isAiReal()) {
        const openai = getOpenAiClient();
        if (openai) {
          try {
            const [matchingScore, riskEval] = await Promise.all([
              prisma.matchingScore.findUnique({ where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } } }),
              prisma.riskEvaluation.findUnique({ where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } } }),
            ]);

            const response = await openai.chat.completions.create({
              model: getModelVersion(),
              temperature: 0.4,
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content: `Você é um consultor de recrutamento. Gere a recomendação de próximo passo mais relevante.
Retorne EXCLUSIVAMENTE um JSON:
{
  "recommendationType": "next-step|stakeholder-check|technical-validation|culture-fit",
  "title": "título curto da recomendação",
  "explanation": "justificativa detalhada",
  "confidence": 0.0-1.0,
  "actionableInsights": ["insight acionável 1", "insight 2"]
}
Seja específico e acionável. Recomendação assistiva — decisão final humana.`,
                },
                {
                  role: 'user',
                  content: `Candidato: ${payload.candidateId}\nVaga: ${payload.vacancyId}\nScore matching: ${matchingScore?.score ?? 'N/A'}/100\nRisco: ${riskEval?.overallRisk ?? 'N/A'} (${riskEval?.riskScore ?? 'N/A'})`,
                },
              ],
            });

            const content = response.choices[0]?.message?.content ?? '{}';
            const parsed = safeJsonParse<{
              recommendationType?: string;
              title?: string;
              explanation?: string;
              confidence?: number;
              actionableInsights?: string[];
            }>(content, {}, 'recommendation_generate');

            recommendationType = parsed.recommendationType ?? recommendationType;
            title = parsed.title ?? title;
            explanation = parsed.explanation ?? explanation;
            confidence = parsed.confidence ?? confidence;
            actionableInsights = parsed.actionableInsights ?? actionableInsights;

            console.log(JSON.stringify({ source: 'worker', event: 'recommendation_generate_real_completed', eventId: evt.id, tokensUsed: response.usage?.total_tokens }));
          } catch (err) {
            console.error(JSON.stringify({ source: 'worker', event: 'recommendation_generate_real_failed', eventId: evt.id, error: String(err) }));
            if (!shouldFallbackToMock('ai')) throw err;
          }
        }
      }

      await prisma.candidateRecommendation.create({
        data: {
          candidateId: payload.candidateId,
          vacancyId: payload.vacancyId,
          recommendationType,
          title,
          explanation,
          confidence,
          actionableInsights: actionableInsights as never,
        },
      });
      await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
    });
    if (ok) processed++;
  }
  return processed;
}

export async function processRiskAnalyzeJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({ where: { topic: 'risk:analyze', processed: false }, take: 20 });
  let processed = 0;
  for (const evt of events) {
    const payload = evt.payload as { candidateId: string; vacancyId: string };
    const ok = await safeProcess('risk:analyze', evt.id, async () => {
      const tenantId = await assertWorkerTenantConsistency(payload.candidateId, payload.vacancyId, 'risk:analyze', evt.id);
      console.log(JSON.stringify({ source: 'worker', event: 'risk_analyze_start', eventId: evt.id, tenantId, candidateId: payload.candidateId, vacancyId: payload.vacancyId }));

      let overallRisk = 'medium';
      let riskScore = 0.5;
      let findings: Array<Record<string, unknown>> = [{ type: 'consistency' }];
      let explanation = 'Risco recalculado via worker.';

      if (isAiReal()) {
        const openai = getOpenAiClient();
        if (openai) {
          try {
            const matchingScore = await prisma.matchingScore.findUnique({
              where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } },
            });

            const response = await openai.chat.completions.create({
              model: getModelVersion(),
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
                  content: `Candidato: ${payload.candidateId}\nVaga: ${payload.vacancyId}\nMatching score: ${matchingScore?.score ?? 'N/A'}\nDimensões: ${JSON.stringify(matchingScore?.dimensions ?? {})}`,
                },
              ],
            });

            const content = response.choices[0]?.message?.content ?? '{}';
            const parsed = safeJsonParse<{
              overallRisk?: string;
              riskScore?: number;
              findings?: Array<Record<string, unknown>>;
              explanation?: string;
            }>(content, {}, 'risk_analyze');

            overallRisk = parsed.overallRisk ?? overallRisk;
            riskScore = parsed.riskScore ?? riskScore;
            findings = parsed.findings ?? findings;
            explanation = parsed.explanation ?? explanation;

            console.log(JSON.stringify({ source: 'worker', event: 'risk_analyze_real_completed', eventId: evt.id, overallRisk, riskScore, findingsCount: findings.length, tokensUsed: response.usage?.total_tokens }));
          } catch (err) {
            console.error(JSON.stringify({ source: 'worker', event: 'risk_analyze_real_failed', eventId: evt.id, error: String(err) }));
            if (!shouldFallbackToMock('ai')) throw err;
          }
        }
      }

      await prisma.riskEvaluation.upsert({
        where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } },
        update: { overallRisk, riskScore, findings: findings as never, explanation },
        create: { candidateId: payload.candidateId, vacancyId: payload.vacancyId, overallRisk, riskScore, findings: findings as never, explanation },
      });
      await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
    });
    if (ok) processed++;
  }
  return processed;
}

export async function processAutomationTriggerJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({ where: { topic: 'automation:trigger', processed: false }, take: 20 });
  let processed = 0;
  for (const evt of events) {
    const payload = evt.payload as { candidateId: string; vacancyId: string; action: string };
    const ok = await safeProcess('automation:trigger', evt.id, async () => {
      const tenantId = await assertWorkerTenantConsistency(payload.candidateId, payload.vacancyId, 'automation:trigger', evt.id);
      console.log(JSON.stringify({ source: 'worker', event: 'automation_trigger_start', eventId: evt.id, tenantId, candidateId: payload.candidateId, vacancyId: payload.vacancyId, action: payload.action }));

      await prisma.automationExecution.create({
        data: {
          candidateId: payload.candidateId,
          vacancyId: payload.vacancyId,
          action: payload.action,
          status: 'executed_assisted',
          inputJson: payload as never,
          outputJson: { success: true } as never,
          executedAt: new Date(),
        },
      });
      await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
    });
    if (ok) processed++;
  }
  return processed;
}

export async function processInviteFollowupJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({ where: { topic: 'invite-followup:send', processed: false }, take: 30 });
  let processed = 0;
  for (const evt of events) {
    const payload = evt.payload as { cadenceId: string; stepKey: string; scheduledAt: string };
    const ok = await safeProcess('invite-followup:send', evt.id, async () => {
      if (new Date(payload.scheduledAt).getTime() > Date.now()) return;

      const attempt = await prisma.inviteFollowUpAttempt.findUnique({
        where: { cadenceId_stepKey: { cadenceId: payload.cadenceId, stepKey: payload.stepKey } },
      });
      if (!attempt || attempt.status === 'sent') {
        await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
        return;
      }

      const cadence = await prisma.inviteFollowUpCadence.findUnique({ where: { id: payload.cadenceId } });
      if (!cadence || cadence.status !== 'active') {
        await prisma.inviteFollowUpAttempt.update({ where: { id: attempt.id }, data: { status: 'cancelled' } });
        await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
        return;
      }

      await prisma.messageDispatch.create({
        data: {
          channel: attempt.channel,
          destination: cadence.candidateId,
          content: JSON.stringify({ type: 'invite-followup', cadenceId: cadence.id, stepKey: attempt.stepKey }),
          status: 'sent',
        },
      });
      await prisma.inviteFollowUpAttempt.update({
        where: { id: attempt.id },
        data: { status: 'sent', sentAt: new Date() },
      });
      await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
    });
    if (ok) processed++;
  }
  return processed;
}

async function run() {
  console.log('[worker] starting');

  const shutdown = () => {
    console.log('[worker] shutting down');
    prisma.$disconnect()
      .then(() => process.exit(0))
      .catch((err: unknown) => { console.error('[worker] disconnect error', err); process.exit(1); });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    const processedResume = await processResumeUploads();
    const processedVideo = await processSmartInterviewVideoJobs();
    const processedAnalysis = await processSmartInterviewAnalysisJobs();
    const processedMatching = await processMatchingComputeJobs();
    const processedInsights = await processInsightsGenerateJobs();
    const processedComparison = await processComparisonGenerateJobs();
    const processedRecommendation = await processRecommendationGenerateJobs();
    const processedRisk = await processRiskAnalyzeJobs();
    const processedAutomation = await processAutomationTriggerJobs();
    const processedInviteFollowup = await processInviteFollowupJobs();
    console.log(`[worker] resume=${processedResume} smartInterviewVideo=${processedVideo} smartInterviewAnalysis=${processedAnalysis} matching=${processedMatching} insights=${processedInsights} comparison=${processedComparison} recommendation=${processedRecommendation} risk=${processedRisk} automation=${processedAutomation} inviteFollowup=${processedInviteFollowup}`);
  } catch (err) {
    console.error('[worker] error', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void run();
}

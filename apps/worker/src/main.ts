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

function isTranscriptionReal(): boolean {
  return process.env.FF_TRANSCRIPTION_REAL === 'true';
}

function isAiReal(): boolean {
  return process.env.FF_AI_REAL === 'true';
}

function shouldFallbackToMock(key: string): boolean {
  const envKey = `${key.toUpperCase().replace(/-/g, '_')}_FALLBACK_TO_MOCK`;
  return process.env[envKey] !== 'false';
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
    const payload = evt.payload as { resumeId: string };
    const ok = await safeProcess('resume.uploaded', evt.id, async () => {
      await prisma.resumeParseResult.upsert({
        where: { resumeId: payload.resumeId },
        update: { status: 'parsed', parsedJson: { summary: 'mock parsed resume' } },
        create: { resumeId: payload.resumeId, status: 'parsed', parsedJson: { summary: 'mock parsed resume' } },
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

            const transcribeClient = new TranscribeClient({ region });

            await transcribeClient.send(new StartTranscriptionJobCommand({
              TranscriptionJobName: jobName,
              LanguageCode: 'pt-BR' as TranscribeLanguageCode,
              MediaFormat: 'webm',
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

            if (jobStatus === 'COMPLETED' && transcriptUri) {
              const response = await fetch(transcriptUri);
              const data = (await response.json()) as { results?: { transcripts?: Array<{ transcript?: string }> } };
              transcriptContent = data.results?.transcripts?.map((t) => t.transcript).join(' ') ?? '';
              provider = 'aws-transcribe';

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

      const existing = await prisma.matchingScore.findUnique({ where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } } });
      const score = existing?.score ?? 50;

      await prisma.matchingScore.upsert({
        where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } },
        update: { score, computedAt: new Date(), modelVersion: 'matching-v1-worker' },
        create: { candidateId: payload.candidateId, vacancyId: payload.vacancyId, score, modelVersion: 'matching-v1-worker' },
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

      await prisma.candidateInsight.upsert({
        where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } },
        update: { summary: 'Insight reprocessado via worker', strengths: ['consistência de sinais'] as never, risks: ['necessário validar contexto'] as never, recommendations: ['review humano obrigatório'] as never },
        create: { candidateId: payload.candidateId, vacancyId: payload.vacancyId, summary: 'Insight reprocessado via worker', strengths: ['consistência de sinais'] as never, risks: ['necessário validar contexto'] as never, recommendations: ['review humano obrigatório'] as never },
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

      await prisma.candidateComparison.upsert({
        where: { vacancyId_leftCandidateId_rightCandidateId: { vacancyId: payload.vacancyId, leftCandidateId: payload.leftCandidateId, rightCandidateId: payload.rightCandidateId } },
        update: { comparisonJson: { generatedBy: 'worker', disclaimer: 'assistive-only' } as never },
        create: { vacancyId: payload.vacancyId, leftCandidateId: payload.leftCandidateId, rightCandidateId: payload.rightCandidateId, comparisonJson: { generatedBy: 'worker', disclaimer: 'assistive-only' } as never },
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

      await prisma.candidateRecommendation.create({
        data: {
          candidateId: payload.candidateId,
          vacancyId: payload.vacancyId,
          recommendationType: 'worker-refresh',
          title: 'Recomendação reprocessada',
          explanation: 'Reprocessamento assistivo via worker; decisão final permanece humana.',
          confidence: 0.65,
          actionableInsights: ['revisar aderência com gestor'] as never,
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

      await prisma.riskEvaluation.upsert({
        where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } },
        update: { overallRisk: 'medium', riskScore: 0.5, findings: [{ type: 'consistency' }] as never, explanation: 'Risco recalculado via worker.' },
        create: { candidateId: payload.candidateId, vacancyId: payload.vacancyId, overallRisk: 'medium', riskScore: 0.5, findings: [{ type: 'consistency' }] as never, explanation: 'Risco recalculado via worker.' },
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

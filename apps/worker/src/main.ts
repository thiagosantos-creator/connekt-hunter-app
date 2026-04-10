import { prisma } from '@connekt/db';
import { withWorkerSpan } from './telemetry.js';

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
      await prisma.smartInterviewTranscript.upsert({
        where: { answerId: payload.answerId },
        update: { status: 'completed', content: 'Transcrição mock gerada pelo worker.' },
        create: { answerId: payload.answerId, status: 'completed', content: 'Transcrição mock gerada pelo worker.' },
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
      await prisma.smartInterviewAiAnalysis.upsert({
        where: { sessionId: payload.sessionId },
        update: {
          status: 'completed',
          summary: 'Análise mock: comunicação clara e exemplos práticos relevantes.',
          highlights: ['clareza', 'objetividade'],
          risks: ['aprofundar detalhes técnicos'],
        },
        create: {
          sessionId: payload.sessionId,
          status: 'completed',
          summary: 'Análise mock: comunicação clara e exemplos práticos relevantes.',
          highlights: ['clareza', 'objetividade'],
          risks: ['aprofundar detalhes técnicos'],
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
    console.log(`[worker] resume=${processedResume} smartInterviewVideo=${processedVideo} smartInterviewAnalysis=${processedAnalysis} matching=${processedMatching} insights=${processedInsights} comparison=${processedComparison} recommendation=${processedRecommendation} risk=${processedRisk} automation=${processedAutomation}`);
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

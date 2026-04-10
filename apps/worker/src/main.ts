import { prisma } from '@connekt/db';

export async function processResumeUploads(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({
    where: { topic: 'resume.uploaded', processed: false },
    take: 10,
  });

  for (const evt of events) {
    const payload = evt.payload as { resumeId: string };
    await prisma.resumeParseResult.upsert({
      where: { resumeId: payload.resumeId },
      update: { status: 'parsed', parsedJson: { summary: 'mock parsed resume' } },
      create: { resumeId: payload.resumeId, status: 'parsed', parsedJson: { summary: 'mock parsed resume' } },
    });
    await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
  }

  return events.length;
}

export async function processSmartInterviewVideoJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({
    where: { topic: 'smart-interview.video-uploaded', processed: false },
    take: 20,
  });

  for (const evt of events) {
    const payload = evt.payload as { answerId: string; sessionId: string };
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
  }

  return events.length;
}

export async function processSmartInterviewAnalysisJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({
    where: { topic: 'smart-interview.transcribed', processed: false },
    take: 20,
  });

  for (const evt of events) {
    const payload = evt.payload as { sessionId: string; answerId: string };

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
  }

  return events.length;
}



export async function processMatchingComputeJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({ where: { topic: 'matching:compute', processed: false }, take: 20 });

  for (const evt of events) {
    const payload = evt.payload as { applicationId: string; candidateId: string; vacancyId: string };
    const existing = await prisma.matchingScore.findUnique({ where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } } });
    const score = existing?.score ?? 50;

    await prisma.matchingScore.upsert({
      where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } },
      update: { score, computedAt: new Date(), modelVersion: 'matching-v1-worker' },
      create: { candidateId: payload.candidateId, vacancyId: payload.vacancyId, score, modelVersion: 'matching-v1-worker' },
    });

    await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
  }

  return events.length;
}

export async function processInsightsGenerateJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({ where: { topic: 'insights:generate', processed: false }, take: 20 });

  for (const evt of events) {
    const payload = evt.payload as { candidateId: string; vacancyId: string };
    await prisma.candidateInsight.upsert({
      where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } },
      update: { summary: 'Insight reprocessado via worker', strengths: ['consistência de sinais'] as never, risks: ['necessário validar contexto'] as never, recommendations: ['review humano obrigatório'] as never },
      create: { candidateId: payload.candidateId, vacancyId: payload.vacancyId, summary: 'Insight reprocessado via worker', strengths: ['consistência de sinais'] as never, risks: ['necessário validar contexto'] as never, recommendations: ['review humano obrigatório'] as never },
    });
    await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
  }

  return events.length;
}

export async function processComparisonGenerateJobs(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({ where: { topic: 'comparison:generate', processed: false }, take: 20 });

  for (const evt of events) {
    const payload = evt.payload as { vacancyId: string; leftCandidateId: string; rightCandidateId: string };
    await prisma.candidateComparison.upsert({
      where: { vacancyId_leftCandidateId_rightCandidateId: { vacancyId: payload.vacancyId, leftCandidateId: payload.leftCandidateId, rightCandidateId: payload.rightCandidateId } },
      update: { comparisonJson: { generatedBy: 'worker', disclaimer: 'assistive-only' } as never },
      create: { vacancyId: payload.vacancyId, leftCandidateId: payload.leftCandidateId, rightCandidateId: payload.rightCandidateId, comparisonJson: { generatedBy: 'worker', disclaimer: 'assistive-only' } as never },
    });
    await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
  }

  return events.length;
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
    console.log(`[worker] resume=${processedResume} smartInterviewVideo=${processedVideo} smartInterviewAnalysis=${processedAnalysis} matching=${processedMatching} insights=${processedInsights} comparison=${processedComparison}`);
  } catch (err) {
    console.error('[worker] error', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();

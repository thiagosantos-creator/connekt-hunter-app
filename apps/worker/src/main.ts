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
    console.log(`[worker] resume=${processedResume} smartInterviewVideo=${processedVideo} smartInterviewAnalysis=${processedAnalysis}`);
  } catch (err) {
    console.error('[worker] error', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();

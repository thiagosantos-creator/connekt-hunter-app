import { prisma } from '@connekt/db';

const POLL_INTERVAL_MS = 2_000;

async function processResumeUploads(): Promise<number> {
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

async function run() {
  console.log('[worker] starting');

  let isShuttingDown = false;

  const shutdown = () => {
    isShuttingDown = true;
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    while (!isShuttingDown) {
      const processed = await processResumeUploads();

      if (processed > 0) {
        console.log(`[worker] processed=${processed}`);
      }

      if (!isShuttingDown) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }
  } catch (err) {
    console.error('[worker] error', err);
    process.exitCode = 1;
  } finally {
    console.log('[worker] shutting down');
    await prisma.$disconnect();
  }
}

run();

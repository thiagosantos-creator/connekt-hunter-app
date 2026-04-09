import { prisma } from '@connekt/db';

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

  const shutdown = () => {
    console.log('[worker] shutting down');
    prisma.$disconnect()
      .then(() => process.exit(0))
      .catch((err: unknown) => { console.error('[worker] disconnect error', err); process.exit(1); });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    const processed = await processResumeUploads();
    console.log(`[worker] processed=${processed}`);
  } catch (err) {
    console.error('[worker] error', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();


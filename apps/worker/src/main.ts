import { prisma } from '@connekt/db';

async function run() {
  const events = await prisma.outboxEvent.findMany({ where: { topic: 'resume.uploaded', processed: false }, take: 10 });
  for (const evt of events) {
    const payload = evt.payload as { resumeId: string };
    await prisma.resumeParseResult.upsert({
      where: { resumeId: payload.resumeId },
      update: { status: 'parsed', parsedJson: { summary: 'mock parsed resume' } },
      create: { resumeId: payload.resumeId, status: 'parsed', parsedJson: { summary: 'mock parsed resume' } }
    });
    await prisma.outboxEvent.update({ where: { id: evt.id }, data: { processed: true } });
  }
  console.log(`processed=${events.length}`);
}

run().finally(() => prisma.$disconnect());

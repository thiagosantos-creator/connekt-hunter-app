import { prisma } from '@connekt/db';

async function main() {
  const c = await prisma.candidate.findUnique({
    where: { email: 'thiagoo@teste.com' },
    include: { profile: true },
  });
  console.dir(c, { depth: null });
}
main().catch(console.error);

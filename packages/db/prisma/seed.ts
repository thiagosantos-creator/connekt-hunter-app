import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'org_demo' },
    update: {},
    create: { id: 'org_demo', name: 'Demo Org' }
  });

  const [admin, headhunter, client] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@demo.local' },
      update: {},
      create: { email: 'admin@demo.local', name: 'Admin', role: 'admin' }
    }),
    prisma.user.upsert({
      where: { email: 'headhunter@demo.local' },
      update: {},
      create: { email: 'headhunter@demo.local', name: 'Headhunter', role: 'headhunter' }
    }),
    prisma.user.upsert({
      where: { email: 'client@demo.local' },
      update: {},
      create: { email: 'client@demo.local', name: 'Client', role: 'client' }
    })
  ]);

  for (const [userId, role] of [[admin.id, 'admin'], [headhunter.id, 'headhunter'], [client.id, 'client']] as const) {
    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId } },
      update: { role },
      create: { organizationId: org.id, userId, role }
    });
  }

  console.log('Seed completed', { org: org.id, admin: admin.email, headhunter: headhunter.email, client: client.email });
}

main().finally(() => prisma.$disconnect());

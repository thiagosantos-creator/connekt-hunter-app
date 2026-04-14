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
      update: { name: 'Admin', role: 'admin' },
      create: { email: 'admin@demo.local', name: 'Admin', role: 'admin' }
    }),
    prisma.user.upsert({
      where: { email: 'headhunter@demo.local' },
      update: { name: 'Headhunter', role: 'headhunter' },
      create: { email: 'headhunter@demo.local', name: 'Headhunter', role: 'headhunter' }
    }),
    prisma.user.upsert({
      where: { email: 'client@demo.local' },
      update: { name: 'Client', role: 'client' },
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

  await prisma.featureFlag.upsert({
    where: { key: 'auth.realProvider' },
    update: {},
    create: { key: 'auth.realProvider', enabled: false, scope: 'staging', metadata: { description: 'Enable real IAM adapter in staging' } },
  });

  await prisma.featureFlag.upsert({
    where: { key: 'auth.socialLogin' },
    update: {},
    create: { key: 'auth.socialLogin', enabled: false, scope: 'staging', metadata: { description: 'Enable social login adapter' } },
  });

  console.log('Seed completed', { org: org.id, admin: admin.email, headhunter: headhunter.email, client: client.email });
}

main().finally(() => prisma.$disconnect());

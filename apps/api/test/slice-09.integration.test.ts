import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { prisma } from '@connekt/db';
import { AppModule } from '../src/app.module.js';
import { processMatchingComputeJobs, processInsightsGenerateJobs, processRecommendationGenerateJobs, processRiskAnalyzeJobs } from '../../worker/src/main.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('Slice 09 integration (real runtime stack)', () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let baseUrl = '';

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('runs recruitment flow with API + DB + worker processors', async () => {
    const email = `slice09-${Date.now()}@example.com`;
    const organization = await prisma.organization.create({ data: { name: `Org ${Date.now()}` } });
    const recruiter = await prisma.user.create({ data: { email: `recruiter-${Date.now()}@example.com`, name: 'Recruiter', role: 'headhunter' } });
    await prisma.membership.create({ data: { organizationId: organization.id, userId: recruiter.id, role: 'admin' } });
    const vacancy = await prisma.vacancy.create({ data: { organizationId: organization.id, title: 'Backend Engineer', description: 'Node' } });

    const inviteRes = await fetch(`${baseUrl}/candidates/invite`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer dev-${recruiter.id}` },
      body: JSON.stringify({ organizationId: organization.id, email, vacancyId: vacancy.id }),
    });
    expect(inviteRes.status).toBe(201);
    const invited = await inviteRes.json() as { token: string };
    const token = invited.token;

    const byTokenRes = await fetch(`${baseUrl}/candidate/token/${token}`);
    expect(byTokenRes.status).toBe(200);

    expect((await fetch(`${baseUrl}/candidate/onboarding/basic`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, fullName: 'Candidate 09', phone: '11999999999' }) })).status).toBe(201);
    expect((await fetch(`${baseUrl}/candidate/onboarding/consent`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })).status).toBe(201);

    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
    const application = await prisma.application.findUniqueOrThrow({ where: { candidateId_vacancyId: { candidateId: candidate.id, vacancyId: vacancy.id } } });

    await prisma.outboxEvent.createMany({
      data: [
        { topic: 'matching:compute', payload: { applicationId: application.id, candidateId: candidate.id, vacancyId: vacancy.id } as never },
        { topic: 'insights:generate', payload: { candidateId: candidate.id, vacancyId: vacancy.id } as never },
        { topic: 'recommendation:generate', payload: { candidateId: candidate.id, vacancyId: vacancy.id } as never },
        { topic: 'risk:analyze', payload: { candidateId: candidate.id, vacancyId: vacancy.id } as never },
      ],
    });

    await processMatchingComputeJobs();
    await processInsightsGenerateJobs();
    await processRecommendationGenerateJobs();
    await processRiskAnalyzeJobs();

    expect(await prisma.matchingScore.findFirst({ where: { candidateId: candidate.id, vacancyId: vacancy.id } })).toBeTruthy();
    expect(await prisma.candidateInsight.findFirst({ where: { candidateId: candidate.id, vacancyId: vacancy.id } })).toBeTruthy();
    expect(await prisma.candidateRecommendation.findFirst({ where: { candidateId: candidate.id, vacancyId: vacancy.id } })).toBeTruthy();
    expect(await prisma.riskEvaluation.findFirst({ where: { candidateId: candidate.id, vacancyId: vacancy.id } })).toBeTruthy();
  });
});

import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AppService {
  async health() {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', service: 'api' };
  }

  async login(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { token: '', error: 'user_not_found' };
    }
    return { token: `dev-${user.id}`, user };
  }

  createVacancy(data: { organizationId: string; title: string; description: string; createdBy: string; }) {
    return prisma.vacancy.create({ data });
  }

  async inviteCandidate(organizationId: string, email: string, vacancyId: string) {
    const candidate = await prisma.candidate.upsert({
      where: { email },
      update: {},
      create: { email, organizationId, token: randomUUID() }
    });

    await prisma.candidateOnboardingSession.upsert({
      where: { candidateId: candidate.id },
      update: {},
      create: { candidateId: candidate.id }
    });

    await prisma.application.upsert({
      where: { candidateId_vacancyId: { candidateId: candidate.id, vacancyId } },
      update: {},
      create: { candidateId: candidate.id, vacancyId }
    });

    await prisma.messageDispatch.create({
      data: { channel: 'email-mock', destination: email, content: `Use token ${candidate.token}` }
    });

    await prisma.auditEvent.create({
      data: { action: 'candidate.invited', entityType: 'candidate', entityId: candidate.id, metadata: { vacancyId } }
    });

    return candidate;
  }

  async onboardingBasic(token: string, fullName: string, phone: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
    await prisma.candidateProfile.upsert({ where: { candidateId: candidate.id }, update: { fullName, phone }, create: { candidateId: candidate.id, fullName, phone } });
    await prisma.candidateOnboardingSession.update({ where: { candidateId: candidate.id }, data: { basicCompleted: true } });
    return { ok: true };
  }

  async onboardingConsent(token: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
    const session = await prisma.candidateOnboardingSession.findUniqueOrThrow({ where: { candidateId: candidate.id } });
    await prisma.candidateConsent.createMany({ data: [{ sessionId: session.id, type: 'lgpd', accepted: true }, { sessionId: session.id, type: 'terms', accepted: true }] });
    await prisma.candidateOnboardingSession.update({ where: { candidateId: candidate.id }, data: { consentCompleted: true } });
    return { ok: true };
  }

  async onboardingResume(token: string, filename: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
    const session = await prisma.candidateOnboardingSession.findUniqueOrThrow({ where: { candidateId: candidate.id } });
    const resume = await prisma.candidateResume.create({ data: { sessionId: session.id, objectKey: `cv/${candidate.id}/${filename}`, provider: 'minio' } });
    await prisma.outboxEvent.create({ data: { topic: 'resume.uploaded', payload: { resumeId: resume.id } } });
    await prisma.candidateOnboardingSession.update({ where: { candidateId: candidate.id }, data: { resumeCompleted: true, status: 'completed' } });
    return resume;
  }

  async shortlist(applicationId: string) {
    const app = await prisma.application.findUniqueOrThrow({ where: { id: applicationId }, include: { vacancy: true } });
    const shortlist = await prisma.shortlist.upsert({ where: { vacancyId: app.vacancyId }, update: {}, create: { vacancyId: app.vacancyId } });
    return prisma.shortlistItem.upsert({ where: { shortlistId_applicationId: { shortlistId: shortlist.id, applicationId } }, update: {}, create: { shortlistId: shortlist.id, applicationId } });
  }

  async evaluate(applicationId: string, evaluatorId: string, comment: string) {
    return prisma.evaluation.create({ data: { applicationId, evaluatorId, comment } });
  }

  async clientDecision(shortlistItemId: string, reviewerId: string, decision: string) {
    const result = await prisma.clientDecision.create({ data: { shortlistItemId, reviewerId, decision } });
    await prisma.auditEvent.create({ data: { action: 'client.decision', entityType: 'shortlistItem', entityId: shortlistItemId, metadata: { decision } } });
    return result;
  }

  async listApplications() {
    return prisma.application.findMany({ include: { candidate: true, vacancy: true } });
  }

  async byToken(token: string) {
    return prisma.candidate.findUnique({ where: { token }, include: { onboarding: true, profile: true } });
  }
}

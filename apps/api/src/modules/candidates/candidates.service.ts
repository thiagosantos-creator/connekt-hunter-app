import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CandidatesService {
  async invite(organizationId: string, email: string, vacancyId: string) {
    const candidate = await prisma.candidate.upsert({
      where: { organizationId_email: { organizationId, email } },
      update: {},
      create: { email, organizationId, token: randomUUID() },
    });

    await prisma.candidateOnboardingSession.upsert({
      where: { candidateId: candidate.id },
      update: {},
      create: { candidateId: candidate.id },
    });

    await prisma.application.upsert({
      where: { candidateId_vacancyId: { candidateId: candidate.id, vacancyId } },
      update: {},
      create: { candidateId: candidate.id, vacancyId },
    });

    await prisma.messageDispatch.create({
      data: { channel: 'email-mock', destination: email, content: `Use token ${candidate.token}` },
    });

    await prisma.auditEvent.create({
      data: { action: 'candidate.invited', entityType: 'candidate', entityId: candidate.id, metadata: { vacancyId } },
    });

    return candidate;
  }

  byToken(token: string) {
    return prisma.candidate.findUnique({
      where: { token },
      include: { onboarding: true, profile: true },
    });
  }
}

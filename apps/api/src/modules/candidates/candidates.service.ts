import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import { EmailGateway } from '../integrations/email.gateway.js';

@Injectable()
export class CandidatesService {
  constructor(private readonly emailGateway: EmailGateway) {}

  async invite(organizationId: string, email: string, vacancyId: string, actorUserId: string) {
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId: actorUserId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    const candidate = await prisma.candidate.upsert({
      where: { email },
      update: {},
      create: { email, organizationId, token: randomUUID(), invitedByUserId: actorUserId },
    });

    await prisma.guestSession.upsert({
      where: { token: candidate.token },
      update: { candidateId: candidate.id, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      create: { candidateId: candidate.id, token: candidate.token, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
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

    await this.emailGateway.sendTemplated({
      tenantId: organizationId,
      to: email,
      templateKey: 'candidate-invite',
      templateVersion: 'v1',
      payload: { token: candidate.token, vacancyId },
      correlationId: candidate.id,
    });

    await prisma.auditEvent.create({
      data: { action: 'candidate.invited', actorId: actorUserId, entityType: 'candidate', entityId: candidate.id, metadata: { vacancyId } },
    });

    return candidate;
  }

  byToken(token: string) {
    return prisma.candidate.findUnique({
      where: { token },
      include: { onboarding: true, profile: true, guestSession: true },
    });
  }
}

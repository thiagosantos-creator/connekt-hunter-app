import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import { EmailGateway } from '../integrations/email.gateway.js';
import { InviteFollowUpService } from '../invite-follow-up/invite-follow-up.service.js';

@Injectable()
export class CandidatesService {
  constructor(
    private readonly emailGateway: EmailGateway,
    private readonly inviteFollowUpService: InviteFollowUpService,
  ) {}

  async invite(input: {
    organizationId: string;
    vacancyId: string;
    channel: 'email' | 'phone';
    destination: string;
    consent: boolean;
    actorUserId: string;
  }) {
    if (!input.consent) throw new BadRequestException('consent_required');
    if (input.channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.destination)) {
      throw new BadRequestException('invalid_email');
    }
    if (input.channel === 'phone' && !/^\+?[1-9]\d{7,14}$/.test(input.destination.replace(/[^\d+]/g, ''))) {
      throw new BadRequestException('invalid_phone');
    }
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: input.organizationId, userId: input.actorUserId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    const email = input.channel === 'email' ? input.destination : `phone-${input.destination.replace(/[^\d+]/g, '')}@placeholder.local`;
    const phone = input.channel === 'phone' ? input.destination : undefined;
    const candidate = await prisma.candidate.upsert({
      where: { email },
      update: { phone: phone ?? undefined },
      create: { email, phone, organizationId: input.organizationId, token: randomUUID(), invitedByUserId: input.actorUserId },
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
      where: { candidateId_vacancyId: { candidateId: candidate.id, vacancyId: input.vacancyId } },
      update: {},
      create: { candidateId: candidate.id, vacancyId: input.vacancyId },
    });

    if (input.channel === 'email') {
      await this.emailGateway.sendTemplated({
        tenantId: input.organizationId,
        to: email,
        templateKey: 'candidate-invite',
        templateVersion: 'v1',
        payload: { token: candidate.token, vacancyId: input.vacancyId },
        correlationId: candidate.id,
      });
    } else {
      await prisma.messageDispatch.create({
        data: {
          channel: 'phone-gateway',
          destination: input.destination,
          content: JSON.stringify({ type: 'candidate-invite', token: candidate.token, vacancyId: input.vacancyId, providerHint: 'sms|whatsapp' }),
          status: 'sent',
        },
      });
    }

    await prisma.auditEvent.create({
      data: {
        action: 'candidate.invited',
        actorId: input.actorUserId,
        entityType: 'candidate',
        entityId: candidate.id,
        metadata: { vacancyId: input.vacancyId, channel: input.channel, destination: input.destination, consent: input.consent },
      },
    });

    await this.inviteFollowUpService.configure(input.actorUserId, {
      organizationId: input.organizationId,
      vacancyId: input.vacancyId,
      candidateId: candidate.id,
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

import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import { EmailGateway } from '../integrations/email.gateway.js';
import { InviteFollowUpService } from '../invite-follow-up/invite-follow-up.service.js';
import { NotificationDispatchService } from '../notification-preferences/notification-dispatch.service.js';

@Injectable()
export class CandidatesService {
  constructor(
    @Inject(EmailGateway) private readonly emailGateway: EmailGateway,
    @Inject(InviteFollowUpService) private readonly inviteFollowUpService: InviteFollowUpService,
    @Inject(NotificationDispatchService) private readonly notificationDispatchService: NotificationDispatchService,
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
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: input.vacancyId },
      select: { id: true, organizationId: true, title: true },
    });
    if (!vacancy || vacancy.organizationId !== input.organizationId) {
      throw new BadRequestException('vacancy_not_found_for_organization');
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

    const application = await prisma.application.upsert({
      where: { candidateId_vacancyId: { candidateId: candidate.id, vacancyId: input.vacancyId } },
      update: {},
      create: { candidateId: candidate.id, vacancyId: input.vacancyId },
    });

    let dispatchId: string | undefined;
    let inviteStatus = 'queued';

    if (input.channel === 'email') {
      const dispatch = await this.emailGateway.sendTemplated({
        tenantId: input.organizationId,
        to: email,
        templateKey: 'candidate-invite',
        templateVersion: 'v1',
        payload: { token: candidate.token, vacancyId: input.vacancyId },
        correlationId: candidate.id,
      });
      dispatchId = dispatch.dispatchId;
      inviteStatus = 'sent';
    } else {
      const phoneDispatch = await prisma.messageDispatch.create({
        data: {
          channel: 'phone-gateway',
          destination: input.destination,
          content: JSON.stringify({ type: 'candidate-invite', token: candidate.token, vacancyId: input.vacancyId, providerHint: 'sms|whatsapp' }),
          status: 'sent',
        },
      });
      dispatchId = phoneDispatch.id;
      inviteStatus = 'sent';
    }

    const invite = await prisma.candidateInvite.create({
      data: {
        organizationId: input.organizationId,
        vacancyId: input.vacancyId,
        candidateId: candidate.id,
        channel: input.channel,
        destination: input.destination,
        status: inviteStatus,
        dispatchId,
        invitedByUserId: input.actorUserId,
        sentAt: inviteStatus === 'sent' ? new Date() : undefined,
        metadata: { applicationId: application.id, vacancyTitle: vacancy.title } as never,
      },
    });

    await prisma.auditEvent.create({
      data: {
        action: 'candidate.invited',
        actorId: input.actorUserId,
        entityType: 'candidate-invite',
        entityId: invite.id,
        metadata: { candidateId: candidate.id, vacancyId: input.vacancyId, channel: input.channel, destination: input.destination, consent: input.consent } as never,
      },
    });

    const recipients = await prisma.membership.findMany({
      where: { organizationId: input.organizationId, role: { in: ['admin', 'headhunter'] } },
      select: { userId: true },
    });

    await this.notificationDispatchService.dispatchToUsers({
      organizationId: input.organizationId,
      userIds: recipients.map((item) => item.userId),
      actorId: input.actorUserId,
      eventKey: 'candidate.invited',
      metadata: {
        inviteId: invite.id,
        candidateId: candidate.id,
        vacancyId: input.vacancyId,
        channel: input.channel,
      },
    });

    await this.inviteFollowUpService.configure(input.actorUserId, {
      organizationId: input.organizationId,
      vacancyId: input.vacancyId,
      candidateId: candidate.id,
    });

    return {
      ...candidate,
      inviteId: invite.id,
      inviteStatus: invite.status,
      inviteChannel: invite.channel,
      inviteDestination: invite.destination,
    };
  }

  byToken(token: string) {
    return prisma.candidate.findUnique({
      where: { token },
      include: {
        onboarding: true,
        profile: true,
        guestSession: true,
        applications: {
          include: {
            vacancy: {
              select: {
                id: true,
                title: true,
                publicationType: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async listInvites(organizationId: string, actorUserId: string, role: string) {
    if (role !== 'admin') {
      const membership = await prisma.membership.findUnique({
        where: { organizationId_userId: { organizationId, userId: actorUserId } },
      });
      if (!membership) throw new ForbiddenException('user_not_member_of_org');
    }

    return prisma.candidateInvite.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        candidate: { select: { id: true, email: true, phone: true, token: true } },
        vacancy: { select: { id: true, title: true } },
      },
    });
  }
}

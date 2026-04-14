import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import { EmailGateway } from '../integrations/email.gateway.js';
import { InviteFollowUpService } from '../invite-follow-up/invite-follow-up.service.js';
import { NotificationDispatchService } from '../notification-preferences/notification-dispatch.service.js';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    @Inject(EmailGateway) private readonly emailGateway: EmailGateway,
    @Inject(InviteFollowUpService) private readonly inviteFollowUpService: InviteFollowUpService,
    @Inject(NotificationDispatchService) private readonly notificationDispatchService: NotificationDispatchService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  async invite(input: {
    organizationId: string;
    vacancyId: string;
    channel: 'email' | 'phone' | 'link';
    destination: string;
    consent: boolean;
    actorUserId: string;
  }) {
    if (!input.consent) throw new BadRequestException('consent_required');
    if (input.channel === 'email' && !this.isValidEmail(input.destination)) {
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

    const email = input.channel === 'email'
      ? input.destination
      : input.channel === 'phone'
        ? `phone-${input.destination.replace(/[^\d+]/g, '')}@placeholder.local`
        : `link-${randomUUID()}@placeholder.local`;
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
    let inviteStatus = 'link_generated';

    if (input.channel === 'email') {
      try {
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
      } catch (err) {
        this.logger.warn({ message: 'Email dispatch failed for invite, link still generated', error: String(err) });
        inviteStatus = 'link_generated';
      }
    } else if (input.channel === 'phone') {
      try {
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
      } catch (err) {
        this.logger.warn({ message: 'Phone dispatch failed for invite, link still generated', error: String(err) });
        inviteStatus = 'link_generated';
      }
    }

    const invite = await prisma.candidateInvite.create({
      data: {
        organizationId: input.organizationId,
        vacancyId: input.vacancyId,
        candidateId: candidate.id,
        channel: input.channel,
        destination: input.channel === 'link' ? 'manual' : input.destination,
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
    await this.assertAccess(organizationId, actorUserId, role);

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

  async listManagedCandidates(organizationId: string, actorUserId: string, role: string) {
    await this.assertAccess(organizationId, actorUserId, role);

    const passwordResetAvailable = this.hasPasswordResetConfig();
    const candidates = await prisma.candidate.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        profile: {
          select: {
            fullName: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            identities: {
              select: {
                provider: true,
                email: true,
              },
            },
          },
        },
        invites: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            channel: true,
            destination: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            applications: true,
            invites: true,
          },
        },
      },
    });

    return candidates.map((candidate) => ({
      id: candidate.id,
      organizationId: candidate.organizationId,
      email: candidate.email,
      phone: candidate.phone,
      fullName: candidate.profile?.fullName ?? null,
      createdAt: candidate.createdAt,
      guestUpgradeAt: candidate.guestUpgradeAt,
      userId: candidate.userId,
      hasLoginAccount: Boolean(candidate.userId),
      authProviders: [...new Set(candidate.user?.identities.map((identity) => identity.provider) ?? [])],
      applicationsCount: candidate._count.applications,
      invitesCount: candidate._count.invites,
      canRequestPasswordReset: Boolean(candidate.userId && passwordResetAvailable && this.isResettableEmail(candidate.email)),
      lastInvite: candidate.invites[0] ?? null,
    }));
  }

  async updateManagedCandidate(
    candidateId: string,
    actorUserId: string,
    role: string,
    payload: { email: string },
  ) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    if (!this.isValidEmail(normalizedEmail)) {
      throw new BadRequestException('invalid_email');
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { user: true },
    });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    await this.assertAccess(candidate.organizationId, actorUserId, role);

    if (normalizedEmail === candidate.email) {
      return this.getManagedCandidate(candidateId);
    }

    const conflictingCandidate = await prisma.candidate.findUnique({ where: { email: normalizedEmail } });
    if (conflictingCandidate && conflictingCandidate.id !== candidateId) {
      throw new BadRequestException('candidate_email_already_in_use');
    }

    if (candidate.userId) {
      const conflictingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (conflictingUser && conflictingUser.id !== candidate.userId) {
        throw new BadRequestException('user_email_already_in_use');
      }

      const conflictingIdentity = await prisma.authIdentity.findFirst({
        where: {
          provider: { in: ['candidate-passwordless', 'candidate-local'] },
          subject: normalizedEmail,
          NOT: { userId: candidate.userId },
        },
      });
      if (conflictingIdentity) {
        throw new BadRequestException('candidate_identity_email_already_in_use');
      }
    }

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { email: normalizedEmail },
    });

    if (candidate.userId) {
      await prisma.user.update({
        where: { id: candidate.userId },
        data: { email: normalizedEmail },
      });
      await prisma.authIdentity.updateMany({
        where: {
          userId: candidate.userId,
          email: candidate.email,
        },
        data: { email: normalizedEmail },
      });
      await prisma.authIdentity.updateMany({
        where: {
          userId: candidate.userId,
          provider: { in: ['candidate-passwordless', 'candidate-local'] },
          subject: candidate.email,
        },
        data: { subject: normalizedEmail },
      });
    }

    await prisma.auditEvent.create({
      data: {
        actorId: actorUserId,
        action: 'candidate.admin-email-updated',
        entityType: 'candidate',
        entityId: candidateId,
        metadata: {
          organizationId: candidate.organizationId,
          before: candidate.email,
          after: normalizedEmail,
        } as never,
      },
    });

    return this.getManagedCandidate(candidateId);
  }

  async requestPasswordReset(candidateId: string, actorUserId: string, role: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        user: {
          select: {
            id: true,
            identities: {
              select: {
                provider: true,
              },
            },
          },
        },
      },
    });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    await this.assertAccess(candidate.organizationId, actorUserId, role);

    if (!candidate.userId || candidate.user?.identities.length === 0) {
      throw new BadRequestException('candidate_has_no_login_account');
    }
    if (!this.isResettableEmail(candidate.email)) {
      throw new BadRequestException('candidate_email_not_resettable');
    }

    const resetUrl = this.buildPasswordResetUrl(candidate.email);
    if (!resetUrl) {
      throw new BadRequestException('candidate_password_reset_unavailable');
    }

    let status: 'sent' | 'manual_action_required' = 'sent';
    let message = 'Solicitação de redefinição enviada para o e-mail do candidato.';

    try {
      await this.emailGateway.sendTemplated({
        tenantId: candidate.organizationId,
        to: candidate.email,
        templateKey: 'candidate-password-reset',
        templateVersion: 'v1',
        payload: {
          candidateId: candidate.id,
          candidateEmail: candidate.email,
          resetUrl,
        },
        correlationId: `candidate-password-reset:${candidate.id}`,
      });
    } catch (error) {
      status = 'manual_action_required';
      message = 'Não foi possível enviar o e-mail automaticamente. Compartilhe o link manualmente com o candidato.';
      this.logger.warn({ message: 'Candidate password reset email failed', error: String(error), candidateId });
    }

    await prisma.auditEvent.create({
      data: {
        actorId: actorUserId,
        action: 'candidate.password-reset-requested',
        entityType: 'candidate',
        entityId: candidateId,
        metadata: {
          organizationId: candidate.organizationId,
          email: candidate.email,
          status,
        } as never,
      },
    });

    return {
      status,
      provider: this.authService.getCandidateAuthConfig().provider,
      email: candidate.email,
      message,
      resetUrl,
    };
  }

  private async getManagedCandidate(candidateId: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        profile: {
          select: {
            fullName: true,
          },
        },
        user: {
          select: {
            id: true,
            identities: {
              select: {
                provider: true,
              },
            },
          },
        },
        invites: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            channel: true,
            destination: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            applications: true,
            invites: true,
          },
        },
      },
    });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    return {
      id: candidate.id,
      organizationId: candidate.organizationId,
      email: candidate.email,
      phone: candidate.phone,
      fullName: candidate.profile?.fullName ?? null,
      createdAt: candidate.createdAt,
      guestUpgradeAt: candidate.guestUpgradeAt,
      userId: candidate.userId,
      hasLoginAccount: Boolean(candidate.userId),
      authProviders: [...new Set(candidate.user?.identities.map((identity) => identity.provider) ?? [])],
      applicationsCount: candidate._count.applications,
      invitesCount: candidate._count.invites,
      canRequestPasswordReset: Boolean(candidate.userId && this.hasPasswordResetConfig() && this.isResettableEmail(candidate.email)),
      lastInvite: candidate.invites[0] ?? null,
    };
  }

  private async assertAccess(organizationId: string, actorUserId: string, role: string) {
    if (role === 'admin') return;
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId: actorUserId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }

  private buildPasswordResetUrl(candidateEmail: string) {
    const config = this.authService.getCandidateAuthConfig();
    if (!config.changePasswordUrl) return null;
    try {
      const url = new URL(config.changePasswordUrl);
      url.searchParams.set('login_hint', candidateEmail);
      return url.toString();
    } catch {
      return null;
    }
  }

  private hasPasswordResetConfig() {
    const config = this.authService.getCandidateAuthConfig();
    if (!config.changePasswordUrl) return false;
    try {
      new URL(config.changePasswordUrl);
      return true;
    } catch {
      return false;
    }
  }

  private isResettableEmail(email: string) {
    return this.isValidEmail(email) && !email.endsWith('@placeholder.local');
  }

  private isValidEmail(email: string) {
    if (!email || email.length > 254 || /\s/.test(email)) return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || !domain || local.length > 64 || domain.length > 253) return false;
    if (!domain.includes('.')) return false;
    const labels = domain.split('.');
    if (labels.some((label) => !label || label.startsWith('-') || label.endsWith('-'))) return false;
    if (!labels.every((label) => /^[a-z0-9-]+$/i.test(label))) return false;
    return true;
  }
}

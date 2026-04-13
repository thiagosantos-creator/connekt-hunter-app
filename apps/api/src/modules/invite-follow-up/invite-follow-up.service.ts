import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';

const DEFAULT_STEPS = [
  { stepKey: 'd1-reminder', daysAfterInvite: 1, channel: 'email' },
  { stepKey: 'd3-reminder', daysAfterInvite: 3, channel: 'email' },
  { stepKey: 'd7-final', daysAfterInvite: 7, channel: 'email' },
];

@Injectable()
export class InviteFollowUpService {
  async configure(actorId: string, payload: {
    organizationId: string;
    vacancyId: string;
    candidateId: string;
    applicationId?: string;
    steps?: Array<{ stepKey: string; daysAfterInvite: number; channel: string }>;
  }) {
    await this.assertMembership(payload.organizationId, actorId);
    const steps = payload.steps?.length ? payload.steps : DEFAULT_STEPS;

    const cadence = await prisma.inviteFollowUpCadence.upsert({
      where: { candidateId_vacancyId: { candidateId: payload.candidateId, vacancyId: payload.vacancyId } },
      update: {
        status: 'active',
        channelPlan: { steps },
        pausedUntil: null,
      },
      create: {
        organizationId: payload.organizationId,
        vacancyId: payload.vacancyId,
        candidateId: payload.candidateId,
        applicationId: payload.applicationId,
        channelPlan: { steps },
        createdBy: actorId,
      },
    });

    for (const step of steps) {
      const scheduledAt = new Date(Date.now() + step.daysAfterInvite * 24 * 60 * 60 * 1000);
      await prisma.inviteFollowUpAttempt.upsert({
        where: { cadenceId_stepKey: { cadenceId: cadence.id, stepKey: step.stepKey } },
        update: { channel: step.channel, scheduledAt, status: 'queued' },
        create: { cadenceId: cadence.id, stepKey: step.stepKey, channel: step.channel, scheduledAt, metadata: { source: 'cadence-config' } },
      });
      await prisma.outboxEvent.create({
        data: {
          topic: 'invite-followup:send',
          payload: { cadenceId: cadence.id, stepKey: step.stepKey, scheduledAt: scheduledAt.toISOString() },
        },
      });
    }

    await prisma.auditEvent.create({
      data: {
        action: 'invite-followup.configured',
        actorId,
        entityType: 'invite-followup-cadence',
        entityId: cadence.id,
        metadata: { stepsCount: steps.length },
      },
    });

    return cadence;
  }

  async listByOrganization(actorId: string, role: string, organizationId: string) {
    if (role !== 'admin') await this.assertMembership(organizationId, actorId);
    return prisma.inviteFollowUpCadence.findMany({ where: { organizationId }, include: { attempts: { orderBy: { scheduledAt: 'asc' } } }, orderBy: { createdAt: 'desc' } });
  }

  async updateStatus(actorId: string, cadenceId: string, action: 'pause' | 'resume' | 'cancel') {
    const cadence = await prisma.inviteFollowUpCadence.findUnique({ where: { id: cadenceId } });
    if (!cadence) throw new NotFoundException('cadence_not_found');
    await this.assertMembership(cadence.organizationId, actorId);

    const status = action === 'cancel' ? 'cancelled' : 'active';
    const pausedUntil = action === 'pause' ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null;
    return prisma.inviteFollowUpCadence.update({ where: { id: cadenceId }, data: { status, pausedUntil } });
  }

  async stopForCandidateResponse(candidateId: string, vacancyId: string) {
    const cadence = await prisma.inviteFollowUpCadence.findUnique({ where: { candidateId_vacancyId: { candidateId, vacancyId } } });
    if (!cadence) return null;
    return prisma.inviteFollowUpCadence.update({ where: { id: cadence.id }, data: { status: 'stopped_response' } });
  }

  private async assertMembership(organizationId: string, actorId: string) {
    const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: actorId } } });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }
}

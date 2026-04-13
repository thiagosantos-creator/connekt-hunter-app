import { Inject, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { EmailGateway } from '../integrations/email.gateway.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';

type DispatchEventInput = {
  organizationId: string;
  userIds: string[];
  eventKey: 'candidate.invited' | 'candidate.step-completed' | 'decision.changed' | 'operational.reminder' | 'access.changed' | 'audit.critical';
  actorId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class NotificationDispatchService {
  constructor(
    @Inject(EmailGateway) private readonly emailGateway: EmailGateway,
    @Inject(NotificationPreferencesService) private readonly notificationPreferences: NotificationPreferencesService,
  ) {}

  async dispatchToUsers(input: DispatchEventInput) {
    const users = await prisma.user.findMany({
      where: { id: { in: input.userIds }, isActive: true },
      include: { notificationPreference: true },
    });

    const created: { userId: string; channel: string; status: string }[] = [];

    for (const user of users) {
      const prefs = user.notificationPreference ?? await this.notificationPreferences.getByUser(user.id);
      const shouldDispatch = this.isEventEnabled(input.eventKey, prefs);

      if (!shouldDispatch) {
        await prisma.notificationDispatch.create({
          data: {
            organizationId: input.organizationId,
            userId: user.id,
            channel: 'none',
            eventKey: input.eventKey,
            destination: user.email,
            status: 'skipped',
            frequency: prefs.frequency,
            failureReason: 'preference_disabled',
            metadata: { actorId: input.actorId, ...input.metadata } as never,
          },
        });
        created.push({ userId: user.id, channel: 'none', status: 'skipped' });
        continue;
      }

      const channels = this.resolveChannels(prefs);
      if (channels.length === 0) {
        await prisma.notificationDispatch.create({
          data: {
            organizationId: input.organizationId,
            userId: user.id,
            channel: 'none',
            eventKey: input.eventKey,
            destination: user.email,
            status: 'skipped',
            frequency: prefs.frequency,
            failureReason: 'no_enabled_channel',
            metadata: { actorId: input.actorId, ...input.metadata } as never,
          },
        });
        created.push({ userId: user.id, channel: 'none', status: 'skipped' });
        continue;
      }

      for (const channel of channels) {
        if (channel === 'email') {
          try {
            await this.emailGateway.sendTemplated({
              tenantId: input.organizationId,
              to: user.email,
              templateKey: input.eventKey,
              templateVersion: 'v1',
              payload: input.metadata ?? {},
              correlationId: `${input.eventKey}:${user.id}`,
            });

            await prisma.notificationDispatch.create({
              data: {
                organizationId: input.organizationId,
                userId: user.id,
                channel,
                eventKey: input.eventKey,
                destination: user.email,
                status: 'sent',
                frequency: prefs.frequency,
                metadata: { actorId: input.actorId, ...input.metadata } as never,
              },
            });
            created.push({ userId: user.id, channel, status: 'sent' });
          } catch (error) {
            await prisma.notificationDispatch.create({
              data: {
                organizationId: input.organizationId,
                userId: user.id,
                channel,
                eventKey: input.eventKey,
                destination: user.email,
                status: 'failed',
                frequency: prefs.frequency,
                failureReason: String(error),
                metadata: { actorId: input.actorId, ...input.metadata } as never,
              },
            });
            created.push({ userId: user.id, channel, status: 'failed' });
          }
          continue;
        }

        await prisma.notificationDispatch.create({
          data: {
            organizationId: input.organizationId,
            userId: user.id,
            channel,
            eventKey: input.eventKey,
            destination: channel === 'in_app' ? user.id : user.email,
            status: channel === 'phone' ? 'skipped' : 'sent',
            frequency: prefs.frequency,
            failureReason: channel === 'phone' ? 'phone_destination_not_available' : undefined,
            metadata: { actorId: input.actorId, ...input.metadata } as never,
          },
        });
        created.push({ userId: user.id, channel, status: channel === 'phone' ? 'skipped' : 'sent' });
      }
    }

    return created;
  }

  private isEventEnabled(eventKey: DispatchEventInput['eventKey'], prefs: Awaited<ReturnType<NotificationPreferencesService['getByUser']>>) {
    if (eventKey === 'candidate.invited') return prefs.eventNewInvite;
    if (eventKey === 'candidate.step-completed') return prefs.eventStepCompleted;
    if (eventKey === 'decision.changed') return prefs.eventDecision;
    if (eventKey === 'operational.reminder') return prefs.eventReminder;
    if (eventKey === 'access.changed') return prefs.eventAccessChange;
    return prefs.eventCriticalAudit;
  }

  private resolveChannels(prefs: Awaited<ReturnType<NotificationPreferencesService['getByUser']>>) {
    const channels: string[] = [];
    if (prefs.emailEnabled) channels.push('email');
    if (prefs.phoneEnabled) channels.push('phone');
    if (prefs.inAppEnabled) channels.push('in_app');
    return channels;
  }
}

import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

export type NotificationPreferencesPayload = {
  emailEnabled: boolean;
  phoneEnabled: boolean;
  inAppEnabled: boolean;
  eventNewInvite: boolean;
  eventStepCompleted: boolean;
  eventDecision: boolean;
  eventReminder: boolean;
  eventAccessChange: boolean;
  eventCriticalAudit: boolean;
  frequency: string;
};

@Injectable()
export class NotificationPreferencesService {
  getByUser(userId: string) {
    return prisma.userNotificationPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        emailEnabled: true,
        phoneEnabled: false,
        inAppEnabled: true,
        eventNewInvite: true,
        eventStepCompleted: true,
        eventDecision: true,
        eventReminder: true,
        eventAccessChange: true,
        eventCriticalAudit: true,
        frequency: 'immediate',
      },
    });
  }

  updateByUser(userId: string, payload: NotificationPreferencesPayload) {
    return prisma.userNotificationPreference.upsert({
      where: { userId },
      update: payload,
      create: { userId, ...payload },
    });
  }

  listDispatchesByUser(userId: string) {
    return prisma.notificationDispatch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

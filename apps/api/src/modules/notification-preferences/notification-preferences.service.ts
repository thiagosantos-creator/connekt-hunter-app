import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class NotificationPreferencesService {
  getByUser(userId: string) {
    return prisma.userNotificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  updateByUser(
    userId: string,
    payload: { emailEnabled: boolean; eventNewInvite: boolean; eventStepCompleted: boolean; eventDecision: boolean; eventReminder: boolean; frequency: string },
  ) {
    return prisma.userNotificationPreference.upsert({
      where: { userId },
      update: payload,
      create: { userId, ...payload },
    });
  }
}

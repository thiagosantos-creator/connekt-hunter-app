import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    user: { findMany: vi.fn() },
    notificationDispatch: { create: vi.fn() },
  },
}));

import { prisma } from '@connekt/db';
import { NotificationDispatchService } from './notification-dispatch.service.js';

describe('NotificationDispatchService', () => {
  const emailGateway = { sendTemplated: vi.fn() };
  const notificationPreferences = {
    getByUser: vi.fn().mockResolvedValue({
      userId: 'u1',
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
    }),
  };
  let service: NotificationDispatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationDispatchService(emailGateway as never, notificationPreferences as never);
  });

  it('dispatches email and in-app when channels are enabled', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{
      id: 'u1',
      email: 'admin@demo.local',
      isActive: true,
      notificationPreference: {
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
    }] as never);
    vi.mocked(prisma.notificationDispatch.create).mockResolvedValue({} as never);
    emailGateway.sendTemplated.mockResolvedValue({ dispatchId: 'dispatch-1' });

    const result = await service.dispatchToUsers({
      organizationId: 'org1',
      userIds: ['u1'],
      eventKey: 'candidate.invited',
    });

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'email', status: 'sent' }),
      expect.objectContaining({ channel: 'in_app', status: 'sent' }),
    ]));
  });

  it('skips dispatch when event is disabled in preferences', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{
      id: 'u1',
      email: 'admin@demo.local',
      isActive: true,
      notificationPreference: {
        emailEnabled: true,
        phoneEnabled: false,
        inAppEnabled: false,
        eventNewInvite: false,
        eventStepCompleted: true,
        eventDecision: true,
        eventReminder: true,
        eventAccessChange: true,
        eventCriticalAudit: true,
        frequency: 'immediate',
      },
    }] as never);
    vi.mocked(prisma.notificationDispatch.create).mockResolvedValue({} as never);

    const result = await service.dispatchToUsers({
      organizationId: 'org1',
      userIds: ['u1'],
      eventKey: 'candidate.invited',
    });

    expect(result).toEqual([expect.objectContaining({ channel: 'none', status: 'skipped' })]);
  });
});

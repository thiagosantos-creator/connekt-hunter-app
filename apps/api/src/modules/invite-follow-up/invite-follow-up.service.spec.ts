import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    membership: { findUnique: vi.fn() },
    inviteFollowUpCadence: { upsert: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    inviteFollowUpAttempt: { upsert: vi.fn() },
    outboxEvent: { create: vi.fn() },
    auditEvent: { create: vi.fn() },
  },
}));

import { prisma } from '@connekt/db';
import { InviteFollowUpService } from './invite-follow-up.service.js';

describe('InviteFollowUpService', () => {
  let service: InviteFollowUpService;

  beforeEach(() => {
    service = new InviteFollowUpService();
    vi.clearAllMocks();
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
  });

  it('creates default cadence and enqueues outbox steps', async () => {
    vi.mocked(prisma.inviteFollowUpCadence.upsert).mockResolvedValue({ id: 'cad1' } as never);
    await service.configure('u1', { organizationId: 'org1', vacancyId: 'vac1', candidateId: 'cand1' });
    expect(prisma.inviteFollowUpAttempt.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.outboxEvent.create).toHaveBeenCalledTimes(3);
  });
});

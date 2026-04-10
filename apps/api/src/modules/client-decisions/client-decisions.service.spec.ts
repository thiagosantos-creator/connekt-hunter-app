import { describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    shortlistItem: {
      findUnique: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    },
    clientDecision: {
      create: vi.fn().mockResolvedValue({ id: 'd1', shortlistItemId: 'si1', reviewerId: 'u1', decision: 'approve' }),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { ClientDecisionsService } from './client-decisions.service.js';
import { prisma } from '@connekt/db';

describe('ClientDecisionsService', () => {
  const service = new ClientDecisionsService();

  it('should throw NotFoundException when shortlistItem does not exist', async () => {
    vi.mocked(prisma.shortlistItem.findUnique).mockResolvedValue(null);
    await expect(service.create('si1', 'u1', 'approve')).rejects.toThrow('shortlist_item_not_found');
  });

  it('should throw ForbiddenException when reviewer is not a member of the org', async () => {
    vi.mocked(prisma.shortlistItem.findUnique).mockResolvedValue({
      id: 'si1',
      shortlist: { vacancy: { organizationId: 'org1' } },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    await expect(service.create('si1', 'u1', 'approve')).rejects.toThrow('user_not_member_of_org');
  });

  it('should create decision with audit event including actorId', async () => {
    vi.mocked(prisma.shortlistItem.findUnique).mockResolvedValue({
      id: 'si1',
      shortlist: { vacancy: { organizationId: 'org1' } },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
    const result = await service.create('si1', 'u1', 'approve');
    expect(result).toBeDefined();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actorId: 'u1', action: 'client.decision' }),
      }),
    );
  });
});

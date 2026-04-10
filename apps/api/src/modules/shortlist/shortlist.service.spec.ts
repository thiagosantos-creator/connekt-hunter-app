import { describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    application: {
      findUnique: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    },
    shortlist: {
      upsert: vi.fn().mockResolvedValue({ id: 's1', vacancyId: 'v1' }),
    },
    shortlistItem: {
      upsert: vi.fn().mockResolvedValue({ id: 'si1', shortlistId: 's1', applicationId: 'a1' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { ShortlistService } from './shortlist.service.js';
import { prisma } from '@connekt/db';

describe('ShortlistService', () => {
  const service = new ShortlistService();

  it('should throw NotFoundException when application does not exist', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue(null);
    await expect(service.addToShortlist('a1', 'u1')).rejects.toThrow('application_not_found');
  });

  it('should throw ForbiddenException when actor is not a member of the org', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'a1',
      vacancyId: 'v1',
      vacancy: { organizationId: 'org1' },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    await expect(service.addToShortlist('a1', 'u1')).rejects.toThrow('user_not_member_of_org');
  });

  it('should create shortlist item and audit event when valid', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'a1',
      vacancyId: 'v1',
      vacancy: { organizationId: 'org1' },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
    const result = await service.addToShortlist('a1', 'u1');
    expect(result).toBeDefined();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'shortlist.added' }) }),
    );
  });

  it('findShortlistedApplications filters by org for non-admin', async () => {
    vi.mocked(prisma.shortlistItem.findMany).mockResolvedValue([]);
    const result = await service.findShortlistedApplications(['org1'], 'client');
    expect(prisma.shortlistItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shortlist: { vacancy: { organizationId: { in: ['org1'] } } } },
      }),
    );
    expect(result).toEqual([]);
  });

  it('findShortlistedApplications returns all for admin', async () => {
    vi.mocked(prisma.shortlistItem.findMany).mockResolvedValue([]);
    await service.findShortlistedApplications([], 'admin');
    expect(prisma.shortlistItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});

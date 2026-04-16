import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    application: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { ApplicationsService } from './applications.service.js';
import { prisma } from '@connekt/db';

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  beforeEach(() => {
    service = new ApplicationsService();
    vi.clearAllMocks();
  });

  it('lists all applications', async () => {
    vi.mocked(prisma.application.findMany).mockResolvedValue([]);
    const result = await service.findAll(['org_demo'], 'headhunter');
    expect(result).toEqual([]);
    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vacancy: { organizationId: { in: ['org_demo'] } } },
        include: { candidate: true, vacancy: true },
        take: 50,
        skip: 0,
      }),
    );
  });

  it('returns rich application dossier for authorized users', async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ id: 'app_1' } as never);

    const result = await service.findById('app_1', ['org_demo'], 'headhunter');

    expect(result).toEqual({ id: 'app_1' });
    expect(prisma.application.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'app_1', vacancy: { organizationId: { in: ['org_demo'] } } },
        include: expect.objectContaining({
          candidate: expect.any(Object),
          vacancy: expect.any(Object),
          evaluations: expect.any(Object),
          shortlistItems: expect.any(Object),
          smartInterviewSessions: expect.any(Object),
        }),
      }),
    );
  });
});

import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    application: {
      findMany: vi.fn(),
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
    const result = await service.findAll();
    expect(result).toEqual([]);
    expect(prisma.application.findMany).toHaveBeenCalledOnce();
  });
});

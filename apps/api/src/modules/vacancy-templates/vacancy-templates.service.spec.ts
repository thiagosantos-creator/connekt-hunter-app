import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    membership: { findUnique: vi.fn() },
    vacancyTemplate: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    vacancyTemplateVersion: { create: vi.fn() },
    auditEvent: { create: vi.fn() },
  },
}));

import { prisma } from '@connekt/db';
import { VacancyTemplatesService } from './vacancy-templates.service.js';

describe('VacancyTemplatesService', () => {
  let service: VacancyTemplatesService;

  beforeEach(() => {
    service = new VacancyTemplatesService();
    vi.clearAllMocks();
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
  });

  it('creates template with initial version', async () => {
    vi.mocked(prisma.vacancyTemplate.create).mockResolvedValue({ id: 't1', version: 1, status: 'draft', defaultFields: {} } as never);
    const result = await service.create('u1', { organizationId: 'org1', name: 'Tech', sector: 'tech', role: 'Backend', defaultFields: {} });
    expect(result.id).toBe('t1');
    expect(prisma.vacancyTemplateVersion.create).toHaveBeenCalledOnce();
  });

  it('lists templates for organizations', async () => {
    vi.mocked(prisma.vacancyTemplate.findMany).mockResolvedValue([]);
    const result = await service.listForUser('u1', 'headhunter', ['org1']);
    expect(result).toEqual([]);
  });
});

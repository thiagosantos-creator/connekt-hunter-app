import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    membership: { findUnique: vi.fn() },
    vacancy: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { VacanciesService } from './vacancies.service.js';
import { prisma } from '@connekt/db';

describe('VacanciesService', () => {
  let service: VacanciesService;

  beforeEach(() => {
    service = new VacanciesService();
    vi.clearAllMocks();
  });

  it('creates a vacancy', async () => {
    const vacancy = { id: 'v1', title: 'Engineer', description: 'Test', organizationId: 'org1', createdBy: 'u1' };
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ organizationId: 'org1', userId: 'u1' } as never);
    vi.mocked(prisma.vacancy.create).mockResolvedValue(vacancy as never);

    const result = await service.create({ organizationId: 'org1', title: 'Engineer', description: 'Test', createdBy: 'u1' });
    expect(result).toEqual(vacancy);
    expect(prisma.vacancy.create).toHaveBeenCalledOnce();
  });

  it('lists vacancies', async () => {
    vi.mocked(prisma.vacancy.findMany).mockResolvedValue([]);
    const result = await service.findAll(['org1'], 'headhunter');
    expect(result).toEqual([]);
  });

  it('generates assistive content with human review flag', () => {
    const result = service.generateAssistiveContent({ title: 'Backend Engineer', seniority: 'senior', sector: 'tecnologia', workModel: 'remote', location: 'São Paulo' });
    expect(result.generatedByAI).toBe(true);
    expect(result.requiresHumanReview).toBe(true);
    expect(result.keywords).toContain('Backend Engineer');
  });
});

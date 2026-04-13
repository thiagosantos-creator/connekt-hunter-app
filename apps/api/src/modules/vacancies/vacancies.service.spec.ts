import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    membership: { findUnique: vi.fn() },
    vacancy: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@connekt/db';
import { VacanciesService } from './vacancies.service.js';

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

  it('rejects publishing when required fields are missing', async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ organizationId: 'org1', userId: 'u1' } as never);

    await expect(service.create({
      organizationId: 'org1',
      title: 'Engineer',
      description: 'Test',
      createdBy: 'u1',
      publicationType: 'public',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists vacancies', async () => {
    vi.mocked(prisma.vacancy.findMany).mockResolvedValue([]);
    const result = await service.findAll(['org1'], 'headhunter');
    expect(result).toEqual([]);
  });

  it('generates assistive content with human review flag', () => {
    const result = service.generateAssistiveContent({ title: 'Backend Engineer', seniority: 'senior', sector: 'tecnologia', workModel: 'remote', location: 'Sao Paulo' });
    expect(result.generatedByAI).toBe(true);
    expect(result.requiresHumanReview).toBe(true);
    expect(result.keywords).toContain('Backend Engineer');
  });

  it('returns a public vacancy only when it is published and complete', async () => {
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({
      id: 'v-public',
      organizationId: 'org1',
      title: 'Backend Engineer',
      description: 'Descricao completa',
      location: 'Sao Paulo',
      workModel: 'remote',
      seniority: 'senior',
      sector: 'Tecnologia',
      experienceYearsMin: 3,
      experienceYearsMax: 6,
      employmentType: 'clt',
      publicationType: 'public',
      status: 'active',
      department: 'Produto',
      requiredSkills: ['Node.js'],
      desiredSkills: ['AWS'],
      salaryMin: 15000,
      salaryMax: 20000,
      publishedAt: new Date('2026-04-13T12:00:00.000Z'),
      createdBy: 'u1',
      organization: {
        id: 'org1',
        name: 'Acme',
        tenantSettings: {
          publicName: 'Acme Tech',
          logoUrl: 'https://cdn.example/logo.png',
          bannerUrl: 'https://cdn.example/banner.png',
          primaryColor: '#123456',
          secondaryColor: '#abcdef',
          contactEmail: 'talentos@acme.com',
        },
      },
    } as never);

    const result = await service.findPublicById('v-public');

    expect(result).toEqual(expect.objectContaining({
      id: 'v-public',
      title: 'Backend Engineer',
      organization: expect.objectContaining({
        name: 'Acme Tech',
        contactEmail: 'talentos@acme.com',
      }),
    }));
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    organization: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
    membership: { upsert: vi.fn() },
    tenantPolicy: { create: vi.fn() },
    tenantSettings: { create: vi.fn(), upsert: vi.fn() },
    auditEvent: { create: vi.fn() },
  },
}));

import { prisma } from '@connekt/db';
import { OrganizationsService } from './organizations.service.js';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(() => {
    service = new OrganizationsService();
    vi.clearAllMocks();
  });

  it('updates organization branding and contact settings', async () => {
    vi.mocked(prisma.organization.findUniqueOrThrow)
      .mockResolvedValueOnce({
        id: 'org1',
        name: 'Acme',
        status: 'active',
        ownerAdminUserId: 'user-1',
        tenantPolicy: null,
        tenantSettings: {
          planSegment: 'standard',
          timezone: 'America/Sao_Paulo',
          operationalCalendar: 'business-days',
          logoUrl: null,
          bannerUrl: null,
          primaryColor: null,
          secondaryColor: null,
          publicName: null,
          communicationDomain: null,
          contactEmail: null,
        },
      } as never)
      .mockResolvedValueOnce({
        id: 'org1',
        name: 'Acme Recrutamento',
        status: 'active',
        ownerAdminUserId: 'user-2',
        tenantPolicy: null,
        tenantSettings: {
          planSegment: 'standard',
          timezone: 'America/Sao_Paulo',
          tenantStatus: 'trial',
          logoUrl: 'https://cdn.example/logo.png',
          bannerUrl: 'https://cdn.example/banner.png',
          primaryColor: '#123456',
          secondaryColor: '#abcdef',
          publicName: 'Acme',
          communicationDomain: 'acme.com',
          contactEmail: 'talentos@acme.com',
        },
      } as never);
    vi.mocked(prisma.organization.update).mockResolvedValue({ id: 'org1' } as never);
    vi.mocked(prisma.membership.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.tenantSettings.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);

    const result = await service.update(
      'org1',
      {
        name: 'Acme Recrutamento',
        ownerAdminUserId: 'user-2',
        branding: {
          publicName: 'Acme',
          contactEmail: 'talentos@acme.com',
          communicationDomain: 'acme.com',
          logoUrl: 'https://cdn.example/logo.png',
          bannerUrl: 'https://cdn.example/banner.png',
          primaryColor: '#123456',
          secondaryColor: '#abcdef',
        },
      },
      'actor-1',
    );

    expect(prisma.organization.update).toHaveBeenCalledOnce();
    expect(prisma.membership.upsert).toHaveBeenCalledOnce();
    expect(prisma.tenantSettings.upsert).toHaveBeenCalledOnce();
    expect(prisma.auditEvent.create).toHaveBeenCalledOnce();
    expect(result).toEqual(expect.objectContaining({ id: 'org1', name: 'Acme Recrutamento' }));
  });
});

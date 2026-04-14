import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    organization: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
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
  const storageGateway = {
    createPresignedUpload: vi.fn(),
    recordAsset: vi.fn(),
    getObjectBuffer: vi.fn(),
  };

  beforeEach(() => {
    service = new OrganizationsService(storageGateway as never);
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
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-2', email: 'owner@acme.com' } as never);
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

  it('resolves owner admin by e-mail when creating organization', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ id: 'user-5', email: 'owner@demo.local' } as never);
    vi.mocked(prisma.organization.create).mockResolvedValue({
      id: 'org-new',
      status: 'active',
    } as never);
    vi.mocked(prisma.membership.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.tenantPolicy.create).mockResolvedValue({} as never);
    vi.mocked(prisma.tenantSettings.create).mockResolvedValue({} as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);
    vi.mocked(prisma.organization.findUniqueOrThrow).mockResolvedValue({
      id: 'org-new',
      name: 'Nova Org',
      ownerAdminUserId: 'user-5',
      status: 'active',
      tenantPolicy: null,
      tenantSettings: null,
    } as never);

    const result = await service.create({
      name: 'Nova Org',
      ownerAdminUserId: 'owner@demo.local',
    }, 'actor-1');

    expect(prisma.organization.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ownerAdminUserId: 'user-5' }),
    }));
    expect(result).toEqual(expect.objectContaining({ id: 'org-new', ownerAdminUserId: 'user-5' }));
  });
});

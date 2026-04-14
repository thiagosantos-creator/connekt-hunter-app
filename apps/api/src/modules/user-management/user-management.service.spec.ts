import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    membership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '@connekt/db';
import { UserManagementService } from './user-management.service.js';

describe('UserManagementService', () => {
  const notificationDispatchService = { dispatchToUsers: vi.fn().mockResolvedValue([]) };
  const storageGateway = {
    createPresignedUpload: vi.fn(),
    recordAsset: vi.fn(),
    getObjectBuffer: vi.fn(),
  };
  let service: UserManagementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserManagementService(notificationDispatchService as never, storageGateway as never);
  });

  it('lists users for a tenant', async () => {
    vi.mocked(prisma.membership.findMany).mockResolvedValue([{
      organizationId: 'org1',
      role: 'admin',
      user: {
        id: 'u1',
        email: 'admin@demo.local',
        name: 'Admin',
        title: 'Administrador',
        avatarUrl: 'https://cdn.example/avatar.png',
        isActive: true,
        notificationPreference: null,
      },
    }] as never);

    const result = await service.list('org1', 'admin-user', 'admin');
    expect(result).toEqual([expect.objectContaining({
      email: 'admin@demo.local',
      tenantId: 'org1',
      title: 'Administrador',
      avatarUrl: 'https://cdn.example/avatar.png',
    })]);
  });

  it('creates an internal managed user and membership', async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'u3',
      email: 'new@demo.local',
      name: 'New User',
      title: 'Recruiter',
    } as never);
    vi.mocked(prisma.membership.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);
    vi.mocked(prisma.membership.findUniqueOrThrow).mockResolvedValue({
      organizationId: 'org1',
      role: 'headhunter',
      user: {
        id: 'u3',
        email: 'new@demo.local',
        name: 'New User',
        title: 'Recruiter',
        avatarUrl: null,
        isActive: true,
        notificationPreference: null,
      },
    } as never);

    const result = await service.create('org1', 'admin-user', 'admin', {
      email: 'new@demo.local',
      name: 'New User',
      role: 'headhunter',
      title: 'Recruiter',
    });

    expect(result).toEqual(expect.objectContaining({
      email: 'new@demo.local',
      role: 'headhunter',
      title: 'Recruiter',
    }));
    expect(prisma.membership.upsert).toHaveBeenCalledOnce();
    expect(notificationDispatchService.dispatchToUsers).toHaveBeenCalledOnce();
  });

  it('updates role and activation with audit trail', async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      organizationId: 'org1',
      role: 'headhunter',
      user: { id: 'u2', email: 'hh@demo.local', name: 'HH', isActive: true },
    } as never);
    vi.mocked(prisma.membership.update).mockResolvedValue({} as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);
    vi.mocked(prisma.membership.findUniqueOrThrow).mockResolvedValue({
      organizationId: 'org1',
      role: 'client',
      user: { id: 'u2', email: 'hh@demo.local', name: 'HH', isActive: false, notificationPreference: null },
    } as never);

    const result = await service.update('org1', 'u2', 'admin-user', 'admin', { role: 'client', isActive: false });

    expect(result).toEqual(expect.objectContaining({ role: 'client', isActive: false }));
    expect(notificationDispatchService.dispatchToUsers).toHaveBeenCalledOnce();
    expect(prisma.auditEvent.create).toHaveBeenCalledOnce();
  });
});

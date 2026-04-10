import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';

vi.mock('@connekt/db', () => ({
  prisma: {
    candidate: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    authIdentity: {
      upsert: vi.fn(),
    },
    userSession: {
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from '@connekt/db';
import { AuthService } from './auth.service.js';

describe('AuthService.guestUpgrade', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService({} as never, {} as never);
    vi.clearAllMocks();
    vi.spyOn(service, 'login').mockResolvedValue({ token: 'session-token' } as never);
  });

  it('does not downgrade existing staff user role', async () => {
    vi.mocked(prisma.candidate.findUniqueOrThrow).mockResolvedValue({
      id: 'cand-1',
      profile: { fullName: 'Guest Name' },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-staff',
      email: 'staff@company.com',
      role: 'admin',
    } as never);

    await expect(service.guestUpgrade('candidate-token', 'staff@company.com', 'Staff Name')).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.authIdentity.upsert).not.toHaveBeenCalled();
    expect(prisma.candidate.update).not.toHaveBeenCalled();
  });

  it('reuses existing candidate user without overwriting role', async () => {
    vi.mocked(prisma.candidate.findUniqueOrThrow).mockResolvedValue({
      id: 'cand-2',
      profile: { fullName: 'Candidate Name' },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-candidate',
      email: 'candidate@company.com',
      role: 'candidate',
    } as never);
    vi.mocked(prisma.authIdentity.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.candidate.update).mockResolvedValue({} as never);

    await service.guestUpgrade('candidate-token', 'candidate@company.com', 'Candidate Name');

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.authIdentity.upsert).toHaveBeenCalledOnce();
    expect(prisma.candidate.update).toHaveBeenCalledWith({
      where: { id: 'cand-2' },
      data: { userId: 'user-candidate', guestUpgradeAt: expect.any(Date) },
    });
  });
});

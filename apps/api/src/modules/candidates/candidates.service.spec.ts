import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    vacancy: { findUnique: vi.fn() },
    candidate: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    candidateInvite: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    candidateOnboardingSession: { upsert: vi.fn() },
    guestSession: { upsert: vi.fn() },
    application: { upsert: vi.fn() },
    auditEvent: { create: vi.fn() },
    messageDispatch: { create: vi.fn() },
    membership: { findUnique: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    authIdentity: { findFirst: vi.fn(), updateMany: vi.fn() },
  },
}));

import { CandidatesService } from './candidates.service.js';
import { prisma } from '@connekt/db';

describe('CandidatesService', () => {
  let service: CandidatesService;
  const emailGateway = { sendTemplated: vi.fn() };
  const inviteFollowUpService = { configure: vi.fn() };
  const notificationDispatchService = { dispatchToUsers: vi.fn() };
  const authService = {
    getCandidateAuthConfig: vi.fn(() => ({
      provider: 'aws-cognito',
      hostedUiUrl: 'https://example.auth.us-east-1.amazoncognito.com/oauth2/authorize',
      changePasswordUrl: 'https://example.auth.us-east-1.amazoncognito.com/forgotPassword?client_id=client&redirect_uri=http%3A%2F%2Flocalhost%3A5174%2Fauth%2Fcallback',
      socialProviders: ['Google', 'LinkedIn'],
    })),
  };

  beforeEach(() => {
    service = new CandidatesService(emailGateway as never, inviteFollowUpService as never, notificationDispatchService as never, authService as never);
    vi.clearAllMocks();
  });

  it('invites a candidate', async () => {
    const candidate = { id: 'c1', email: 'a@b.com', token: 'tok', organizationId: 'org1' };
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1', title: 'Engineer' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ organizationId: 'org1', userId: 'u1' } as never);
    vi.mocked(prisma.membership.findMany).mockResolvedValue([{ userId: 'u1' }] as never);
    vi.mocked(prisma.candidate.upsert).mockResolvedValue(candidate as never);
    vi.mocked(prisma.guestSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.candidateOnboardingSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.application.upsert).mockResolvedValue({ id: 'app1' } as never);
    vi.mocked(prisma.candidateInvite.create).mockResolvedValue({ id: 'invite1', status: 'sent', channel: 'email', destination: 'a@b.com' } as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);
    emailGateway.sendTemplated.mockResolvedValue({ dispatchId: 'dispatch-1' });
    notificationDispatchService.dispatchToUsers.mockResolvedValue([]);

    const result = await service.invite({
      organizationId: 'org1',
      vacancyId: 'v1',
      channel: 'email',
      destination: 'a@b.com',
      consent: true,
      actorUserId: 'u1',
    });
    expect(result).toEqual(expect.objectContaining({ id: candidate.id, inviteId: 'invite1', inviteStatus: 'sent' }));
    expect(prisma.candidate.upsert).toHaveBeenCalledOnce();
    expect(emailGateway.sendTemplated).toHaveBeenCalledOnce();
    expect(prisma.auditEvent.create).toHaveBeenCalledOnce();
    expect(inviteFollowUpService.configure).toHaveBeenCalledOnce();
  });

  it('looks up candidate by token', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue(null);
    const result = await service.byToken('tok');
    expect(result).toBeNull();
  });

  it('supports phone invites with phone gateway fallback', async () => {
    const candidate = { id: 'c2', email: 'phone-+5511999999999@placeholder.local', token: 'tok-phone', organizationId: 'org1' };
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1', title: 'Engineer' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ organizationId: 'org1', userId: 'u1' } as never);
    vi.mocked(prisma.membership.findMany).mockResolvedValue([{ userId: 'u1' }] as never);
    vi.mocked(prisma.candidate.upsert).mockResolvedValue(candidate as never);
    vi.mocked(prisma.guestSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.candidateOnboardingSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.application.upsert).mockResolvedValue({ id: 'app2' } as never);
    vi.mocked(prisma.messageDispatch.create).mockResolvedValue({ id: 'dispatch-phone' } as never);
    vi.mocked(prisma.candidateInvite.create).mockResolvedValue({ id: 'invite-phone', status: 'sent', channel: 'phone', destination: '+5511999999999' } as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);
    notificationDispatchService.dispatchToUsers.mockResolvedValue([]);

    const result = await service.invite({
      organizationId: 'org1',
      vacancyId: 'v1',
      channel: 'phone',
      destination: '+5511999999999',
      consent: true,
      actorUserId: 'u1',
    });

    expect(result).toEqual(expect.objectContaining({ inviteChannel: 'phone', inviteStatus: 'sent' }));
    expect(prisma.messageDispatch.create).toHaveBeenCalledOnce();
  });

  it('supports link-only invites without email/phone dispatch', async () => {
    const candidate = { id: 'c3', email: 'link-uuid@placeholder.local', token: 'tok-link', organizationId: 'org1' };
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1', title: 'Engineer' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ organizationId: 'org1', userId: 'u1' } as never);
    vi.mocked(prisma.membership.findMany).mockResolvedValue([{ userId: 'u1' }] as never);
    vi.mocked(prisma.candidate.upsert).mockResolvedValue(candidate as never);
    vi.mocked(prisma.guestSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.candidateOnboardingSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.application.upsert).mockResolvedValue({ id: 'app3' } as never);
    vi.mocked(prisma.candidateInvite.create).mockResolvedValue({ id: 'invite-link', status: 'link_generated', channel: 'link', destination: 'manual' } as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);
    notificationDispatchService.dispatchToUsers.mockResolvedValue([]);

    const result = await service.invite({
      organizationId: 'org1',
      vacancyId: 'v1',
      channel: 'link',
      destination: 'manual',
      consent: true,
      actorUserId: 'u1',
    });

    expect(result).toEqual(expect.objectContaining({ inviteChannel: 'link', inviteStatus: 'link_generated' }));
    expect(emailGateway.sendTemplated).not.toHaveBeenCalled();
    expect(prisma.messageDispatch.create).not.toHaveBeenCalled();
  });

  it('generates link even when email dispatch fails', async () => {
    const candidate = { id: 'c4', email: 'failmail@test.com', token: 'tok-fail', organizationId: 'org1' };
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1', title: 'Engineer' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ organizationId: 'org1', userId: 'u1' } as never);
    vi.mocked(prisma.membership.findMany).mockResolvedValue([{ userId: 'u1' }] as never);
    vi.mocked(prisma.candidate.upsert).mockResolvedValue(candidate as never);
    vi.mocked(prisma.guestSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.candidateOnboardingSession.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.application.upsert).mockResolvedValue({ id: 'app4' } as never);
    vi.mocked(prisma.candidateInvite.create).mockResolvedValue({ id: 'invite-fail', status: 'link_generated', channel: 'email', destination: 'failmail@test.com' } as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);
    emailGateway.sendTemplated.mockRejectedValue(new Error('SMTP not configured'));
    notificationDispatchService.dispatchToUsers.mockResolvedValue([]);

    const result = await service.invite({
      organizationId: 'org1',
      vacancyId: 'v1',
      channel: 'email',
      destination: 'failmail@test.com',
      consent: true,
      actorUserId: 'u1',
    });

    expect(result).toEqual(expect.objectContaining({ inviteId: 'invite-fail', inviteStatus: 'link_generated' }));
    expect(emailGateway.sendTemplated).toHaveBeenCalledOnce();
  });

  it('updates a managed candidate email and linked identity', async () => {
    vi.mocked(prisma.candidate.findUnique)
      .mockResolvedValueOnce({
        id: 'c-managed',
        organizationId: 'org1',
        email: 'old@test.com',
        userId: 'user-1',
        user: { id: 'user-1', email: 'old@test.com' },
      } as never)
      .mockResolvedValueOnce({
        id: 'c-managed',
        organizationId: 'org1',
        email: 'new@test.com',
        phone: null,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        guestUpgradeAt: new Date('2026-04-14T00:10:00.000Z'),
        userId: 'user-1',
        profile: { fullName: 'Candidate' },
        user: { identities: [{ provider: 'candidate-passwordless' }] },
        invites: [],
        _count: { applications: 1, invites: 2 },
      } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ organizationId: 'org1', userId: 'admin-1' } as never);
    vi.mocked(prisma.candidate.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.authIdentity.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.candidate.update).mockResolvedValue({} as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(prisma.authIdentity.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);

    const result = await service.updateManagedCandidate('c-managed', 'admin-1', 'headhunter', { email: 'NEW@test.com' });

    expect(prisma.candidate.update).toHaveBeenCalledWith({
      where: { id: 'c-managed' },
      data: { email: 'new@test.com' },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { email: 'new@test.com' },
    });
    expect(result).toEqual(expect.objectContaining({ id: 'c-managed', email: 'new@test.com' }));
  });

  it('requests candidate password reset and returns provider link', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({
      id: 'c-reset',
      organizationId: 'org1',
      email: 'candidate@test.com',
      userId: 'user-1',
      user: { id: 'user-1', identities: [{ provider: 'candidate-passwordless' }] },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ organizationId: 'org1', userId: 'admin-1' } as never);
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as never);
    emailGateway.sendTemplated.mockResolvedValue({ dispatchId: 'dispatch-1' });

    const result = await service.requestPasswordReset('c-reset', 'admin-1', 'headhunter');

    expect(emailGateway.sendTemplated).toHaveBeenCalledOnce();
    expect(result).toEqual(expect.objectContaining({
      status: 'sent',
      email: 'candidate@test.com',
    }));
    expect(result.resetUrl).toContain('login_hint=candidate%40test.com');
  });
});

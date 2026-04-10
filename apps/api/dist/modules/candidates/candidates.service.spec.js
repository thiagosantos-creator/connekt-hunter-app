import { vi, describe, it, expect, beforeEach } from 'vitest';
vi.mock('@connekt/db', () => ({
    prisma: {
        membership: { findUnique: vi.fn() },
        candidate: {
            upsert: vi.fn(),
            findUnique: vi.fn(),
        },
        candidateOnboardingSession: { upsert: vi.fn() },
        guestSession: { upsert: vi.fn() },
        application: { upsert: vi.fn() },
        auditEvent: { create: vi.fn() },
    },
}));
import { CandidatesService } from './candidates.service.js';
import { prisma } from '@connekt/db';
describe('CandidatesService', () => {
    let service;
    const emailGateway = { sendTemplated: vi.fn() };
    beforeEach(() => {
        service = new CandidatesService(emailGateway);
        vi.clearAllMocks();
    });
    it('invites a candidate', async () => {
        const candidate = { id: 'c1', email: 'a@b.com', token: 'tok', organizationId: 'org1' };
        vi.mocked(prisma.membership.findUnique).mockResolvedValue({ organizationId: 'org1', userId: 'u1' });
        vi.mocked(prisma.candidate.upsert).mockResolvedValue(candidate);
        vi.mocked(prisma.guestSession.upsert).mockResolvedValue({});
        vi.mocked(prisma.candidateOnboardingSession.upsert).mockResolvedValue({});
        vi.mocked(prisma.application.upsert).mockResolvedValue({});
        vi.mocked(prisma.auditEvent.create).mockResolvedValue({});
        const result = await service.invite('org1', 'a@b.com', 'v1', 'u1');
        expect(result).toEqual(candidate);
        expect(prisma.candidate.upsert).toHaveBeenCalledOnce();
        expect(emailGateway.sendTemplated).toHaveBeenCalledOnce();
        expect(prisma.auditEvent.create).toHaveBeenCalledOnce();
    });
    it('looks up candidate by token', async () => {
        vi.mocked(prisma.candidate.findUnique).mockResolvedValue(null);
        const result = await service.byToken('tok');
        expect(result).toBeNull();
    });
});
//# sourceMappingURL=candidates.service.spec.js.map
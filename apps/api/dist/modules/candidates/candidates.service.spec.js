import { vi, describe, it, expect, beforeEach } from 'vitest';
vi.mock('@connekt/db', () => ({
    prisma: {
        candidate: {
            upsert: vi.fn(),
            findUnique: vi.fn(),
        },
        candidateOnboardingSession: { upsert: vi.fn() },
        application: { upsert: vi.fn() },
        messageDispatch: { create: vi.fn() },
        auditEvent: { create: vi.fn() },
    },
}));
import { CandidatesService } from './candidates.service.js';
import { prisma } from '@connekt/db';
describe('CandidatesService', () => {
    let service;
    beforeEach(() => {
        service = new CandidatesService();
        vi.clearAllMocks();
    });
    it('invites a candidate', async () => {
        const candidate = { id: 'c1', email: 'a@b.com', token: 'tok', organizationId: 'org1' };
        vi.mocked(prisma.candidate.upsert).mockResolvedValue(candidate);
        vi.mocked(prisma.candidateOnboardingSession.upsert).mockResolvedValue({});
        vi.mocked(prisma.application.upsert).mockResolvedValue({});
        vi.mocked(prisma.messageDispatch.create).mockResolvedValue({});
        vi.mocked(prisma.auditEvent.create).mockResolvedValue({});
        const result = await service.invite('org1', 'a@b.com', 'v1');
        expect(result).toEqual(candidate);
        expect(prisma.candidate.upsert).toHaveBeenCalledOnce();
        expect(prisma.messageDispatch.create).toHaveBeenCalledOnce();
        expect(prisma.auditEvent.create).toHaveBeenCalledOnce();
    });
    it('looks up candidate by token', async () => {
        vi.mocked(prisma.candidate.findUnique).mockResolvedValue(null);
        const result = await service.byToken('tok');
        expect(result).toBeNull();
    });
});
//# sourceMappingURL=candidates.service.spec.js.map
import { CandidatesService } from './candidates.service.js';
import type { AuthUser } from '../auth/auth.types.js';
export declare class CandidatesController {
    private readonly candidatesService;
    constructor(candidatesService: CandidatesService);
    invite(body: {
        organizationId: string;
        email: string;
        vacancyId: string;
    }, user: AuthUser): Promise<{
        email: string;
        id: string;
        createdAt: Date;
        token: string;
        userId: string | null;
        organizationId: string;
        invitedByUserId: string | null;
        guestUpgradeAt: Date | null;
    }>;
    byToken(token: string): import("@prisma/client").Prisma.Prisma__CandidateClient<({
        profile: {
            id: string;
            candidateId: string;
            fullName: string | null;
            phone: string | null;
        } | null;
        onboarding: {
            id: string;
            candidateId: string;
            status: string;
            basicCompleted: boolean;
            consentCompleted: boolean;
            resumeCompleted: boolean;
        } | null;
        guestSession: {
            id: string;
            createdAt: Date;
            token: string;
            expiresAt: Date;
            candidateId: string;
            upgradedAt: Date | null;
        } | null;
    } & {
        email: string;
        id: string;
        createdAt: Date;
        token: string;
        userId: string | null;
        organizationId: string;
        invitedByUserId: string | null;
        guestUpgradeAt: Date | null;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}

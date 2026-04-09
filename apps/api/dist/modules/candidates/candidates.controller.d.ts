import { CandidatesService } from './candidates.service.js';
export declare class CandidatesController {
    private readonly candidatesService;
    constructor(candidatesService: CandidatesService);
    invite(body: {
        organizationId: string;
        email: string;
        vacancyId: string;
    }): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        organizationId: string;
        token: string;
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
            basicCompleted: boolean;
            consentCompleted: boolean;
            resumeCompleted: boolean;
            status: string;
        } | null;
    } & {
        id: string;
        email: string;
        createdAt: Date;
        organizationId: string;
        token: string;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}

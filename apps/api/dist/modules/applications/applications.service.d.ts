export declare class ApplicationsService {
    findAll(organizationIds: string[]): import("@prisma/client").Prisma.PrismaPromise<({
        candidate: {
            email: string;
            id: string;
            createdAt: Date;
            token: string;
            userId: string | null;
            organizationId: string;
            invitedByUserId: string | null;
            guestUpgradeAt: Date | null;
        };
        vacancy: {
            id: string;
            createdAt: Date;
            organizationId: string;
            title: string;
            description: string;
            createdBy: string;
        };
    } & {
        id: string;
        createdAt: Date;
        candidateId: string;
        status: string;
        vacancyId: string;
    })[]>;
}

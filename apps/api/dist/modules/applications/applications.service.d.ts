export declare class ApplicationsService {
    findAll(): import("@prisma/client").Prisma.PrismaPromise<({
        vacancy: {
            id: string;
            createdAt: Date;
            title: string;
            description: string;
            organizationId: string;
            createdBy: string;
        };
        candidate: {
            id: string;
            email: string;
            createdAt: Date;
            organizationId: string;
            token: string;
        };
    } & {
        id: string;
        createdAt: Date;
        candidateId: string;
        status: string;
        vacancyId: string;
    })[]>;
}

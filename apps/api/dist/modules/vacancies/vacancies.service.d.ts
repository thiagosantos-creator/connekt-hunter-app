export declare class VacanciesService {
    create(data: {
        organizationId: string;
        title: string;
        description: string;
        createdBy: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        organizationId: string;
        title: string;
        description: string;
        createdBy: string;
    }>;
    findAll(organizationIds: string[]): import("@prisma/client").Prisma.PrismaPromise<({
        organization: {
            id: string;
            name: string;
            createdAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        organizationId: string;
        title: string;
        description: string;
        createdBy: string;
    })[]>;
}

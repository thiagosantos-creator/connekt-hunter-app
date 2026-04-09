export declare class VacanciesService {
    create(data: {
        organizationId: string;
        title: string;
        description: string;
        createdBy: string;
    }): import("@prisma/client").Prisma.Prisma__VacancyClient<{
        id: string;
        createdAt: Date;
        title: string;
        description: string;
        organizationId: string;
        createdBy: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<({
        organization: {
            id: string;
            name: string;
            createdAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        title: string;
        description: string;
        organizationId: string;
        createdBy: string;
    })[]>;
}

export declare class OrganizationsService {
    create(data: {
        name: string;
        createdBy: string;
    }): import("@prisma/client").Prisma.Prisma__OrganizationClient<{
        id: string;
        name: string;
        createdAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        createdAt: Date;
    }[]>;
}

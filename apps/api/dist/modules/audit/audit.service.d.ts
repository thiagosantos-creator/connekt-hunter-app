type JsonObject = {
    [key: string]: JsonValue;
};
type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export declare class AuditService {
    log(action: string, entityType: string, entityId: string, metadata?: JsonObject): import("@prisma/client").Prisma.Prisma__AuditEventClient<{
        id: string;
        createdAt: Date;
        actorId: string | null;
        action: string;
        entityType: string;
        entityId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        actorId: string | null;
        action: string;
        entityType: string;
        entityId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
}
export {};

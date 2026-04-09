import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

type JsonObject = { [key: string]: JsonValue };
type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;

@Injectable()
export class AuditService {
  log(action: string, entityType: string, entityId: string, metadata: JsonObject = {}) {
    return prisma.auditEvent.create({ data: { action, entityType, entityId, metadata: metadata as never } });
  }

  findAll() {
    return prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' } });
  }
}

import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

type JsonObject = { [key: string]: JsonValue };
type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;

@Injectable()
export class AuditService {
  log(action: string, entityType: string, entityId: string, metadata: JsonObject = {}) {
    return prisma.auditEvent.create({ data: { action, entityType, entityId, metadata: metadata as never } });
  }

  async findAll() {
    const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    const actorIds = [...new Set(events.map((event) => event.actorId).filter(Boolean))] as string[];
    const users = actorIds.length === 0
      ? []
      : await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } });
    const byId = new Map(users.map((user) => [user.id, user.email]));

    return events.map((event) => ({
      ...event,
      actorEmail: event.actorId ? byId.get(event.actorId) ?? 'system@local' : 'system@local',
      target: `${event.entityType}:${event.entityId}`,
    }));
  }
}

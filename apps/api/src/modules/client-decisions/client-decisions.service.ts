import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class ClientDecisionsService {
  async create(shortlistItemId: string, reviewerId: string, decision: string) {
    const result = await prisma.clientDecision.create({
      data: { shortlistItemId, reviewerId, decision },
    });
    await prisma.auditEvent.create({
      data: {
        action: 'client.decision',
        entityType: 'shortlistItem',
        entityId: shortlistItemId,
        metadata: { decision },
      },
    });
    return result;
  }
}

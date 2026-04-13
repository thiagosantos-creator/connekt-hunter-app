import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class ClientDecisionsService {
  async findAll(organizationIds: string[], role: string) {
    const where = role === 'admin'
      ? {}
      : { shortlistItem: { shortlist: { vacancy: { organizationId: { in: organizationIds } } } } };
    return prisma.clientDecision.findMany({
      where,
      include: {
        shortlistItem: {
          include: {
            application: {
              include: { candidate: true, vacancy: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(shortlistItemId: string, reviewerId: string, decision: string) {
    const shortlistItem = await prisma.shortlistItem.findUnique({
      where: { id: shortlistItemId },
      include: { shortlist: { include: { vacancy: true } } },
    });
    if (!shortlistItem) throw new NotFoundException('shortlist_item_not_found');

    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: shortlistItem.shortlist.vacancy.organizationId,
          userId: reviewerId,
        },
      },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    const result = await prisma.clientDecision.create({
      data: { shortlistItemId, reviewerId, decision },
    });
    await prisma.auditEvent.create({
      data: {
        actorId: reviewerId,
        action: 'client.decision',
        entityType: 'ShortlistItem',
        entityId: shortlistItemId,
        metadata: { decision, clientDecisionId: result.id } as never,
      },
    });
    return result;
  }
}

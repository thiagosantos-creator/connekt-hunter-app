import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  private static readonly VALID_DECISIONS = ['approve', 'reject', 'interview', 'hold'] as const;

  async create(shortlistItemId: string, reviewerId: string, decision: string) {
    if (!ClientDecisionsService.VALID_DECISIONS.includes(decision as never)) {
      throw new BadRequestException(
        `invalid_decision: must be one of ${ClientDecisionsService.VALID_DECISIONS.join(', ')}`,
      );
    }

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

  async createPublic(shortlistItemId: string, token: string, decision: string) {
    if (!ClientDecisionsService.VALID_DECISIONS.includes(decision as never)) {
      throw new BadRequestException(
        `invalid_decision: must be one of ${ClientDecisionsService.VALID_DECISIONS.join(', ')}`,
      );
    }

    // Verify the token is a valid, non-expired ClientReviewSession and scopes to this item's vacancy
    const session = await prisma.clientReviewSession.findUnique({ where: { token } });
    if (!session || new Date(session.expiresAt) < new Date()) {
      throw new ForbiddenException('token_invalid_or_expired');
    }

    const shortlistItem = await prisma.shortlistItem.findUnique({
      where: { id: shortlistItemId },
      include: { shortlist: { include: { vacancy: true } } },
    });
    if (!shortlistItem) throw new NotFoundException('shortlist_item_not_found');

    // Ensure the item belongs to the vacancy scoped by the token
    if (shortlistItem.shortlist.vacancy.id !== session.vacancyId) {
      throw new ForbiddenException('item_not_in_review_scope');
    }

    const result = await prisma.clientDecision.create({
      data: { shortlistItemId, reviewerId: null, decision },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: null,
        action: 'client.public_review.decision',
        entityType: 'ShortlistItem',
        entityId: shortlistItemId,
        metadata: { decision, clientDecisionId: result.id, tokenId: session.id, vacancyId: session.vacancyId } as never,
      },
    });

    return result;
  }
}

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
let ClientDecisionsService = class ClientDecisionsService {
    async create(shortlistItemId, reviewerId, decision) {
        const shortlistItem = await prisma.shortlistItem.findUnique({
            where: { id: shortlistItemId },
            include: { shortlist: { include: { vacancy: true } } },
        });
        if (!shortlistItem)
            throw new NotFoundException('shortlist_item_not_found');
        const membership = await prisma.membership.findUnique({
            where: {
                organizationId_userId: {
                    organizationId: shortlistItem.shortlist.vacancy.organizationId,
                    userId: reviewerId,
                },
            },
        });
        if (!membership)
            throw new ForbiddenException('user_not_member_of_org');
        const result = await prisma.clientDecision.create({
            data: { shortlistItemId, reviewerId, decision },
        });
        await prisma.auditEvent.create({
            data: {
                actorId: reviewerId,
                action: 'client.decision',
                entityType: 'ShortlistItem',
                entityId: shortlistItemId,
                metadata: { decision, clientDecisionId: result.id },
            },
        });
        return result;
    }
};
ClientDecisionsService = __decorate([
    Injectable()
], ClientDecisionsService);
export { ClientDecisionsService };
//# sourceMappingURL=client-decisions.service.js.map
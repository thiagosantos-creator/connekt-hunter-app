var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
let ShortlistService = class ShortlistService {
    async addToShortlist(applicationId, actorId) {
        const app = await prisma.application.findUnique({
            where: { id: applicationId },
            include: { vacancy: true },
        });
        if (!app)
            throw new NotFoundException('application_not_found');
        if (actorId) {
            const membership = await prisma.membership.findUnique({
                where: { organizationId_userId: { organizationId: app.vacancy.organizationId, userId: actorId } },
            });
            if (!membership)
                throw new ForbiddenException('user_not_member_of_org');
        }
        const shortlist = await prisma.shortlist.upsert({
            where: { vacancyId: app.vacancyId },
            update: {},
            create: { vacancyId: app.vacancyId },
        });
        const item = await prisma.shortlistItem.upsert({
            where: { shortlistId_applicationId: { shortlistId: shortlist.id, applicationId } },
            update: {},
            create: { shortlistId: shortlist.id, applicationId },
        });
        await prisma.auditEvent.create({
            data: {
                actorId,
                action: 'shortlist.added',
                entityType: 'Application',
                entityId: applicationId,
                metadata: { vacancyId: app.vacancyId, shortlistId: shortlist.id },
            },
        });
        return item;
    }
};
ShortlistService = __decorate([
    Injectable()
], ShortlistService);
export { ShortlistService };
//# sourceMappingURL=shortlist.service.js.map
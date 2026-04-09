var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
let ShortlistService = class ShortlistService {
    async addToShortlist(applicationId) {
        const app = await prisma.application.findUniqueOrThrow({
            where: { id: applicationId },
            include: { vacancy: true },
        });
        const shortlist = await prisma.shortlist.upsert({
            where: { vacancyId: app.vacancyId },
            update: {},
            create: { vacancyId: app.vacancyId },
        });
        return prisma.shortlistItem.upsert({
            where: { shortlistId_applicationId: { shortlistId: shortlist.id, applicationId } },
            update: {},
            create: { shortlistId: shortlist.id, applicationId },
        });
    }
};
ShortlistService = __decorate([
    Injectable()
], ShortlistService);
export { ShortlistService };
//# sourceMappingURL=shortlist.service.js.map
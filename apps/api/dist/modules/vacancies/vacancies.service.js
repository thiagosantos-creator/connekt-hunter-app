var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
let VacanciesService = class VacanciesService {
    async create(data) {
        const membership = await prisma.membership.findUnique({
            where: { organizationId_userId: { organizationId: data.organizationId, userId: data.createdBy } },
        });
        if (!membership)
            throw new ForbiddenException('user_not_member_of_org');
        return prisma.vacancy.create({ data });
    }
    findAll(organizationIds) {
        return prisma.vacancy.findMany({
            where: { organizationId: { in: organizationIds } },
            include: { organization: true },
        });
    }
};
VacanciesService = __decorate([
    Injectable()
], VacanciesService);
export { VacanciesService };
//# sourceMappingURL=vacancies.service.js.map
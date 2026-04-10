var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
let EvaluationsService = class EvaluationsService {
    async create(applicationId, evaluatorId, comment) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: { vacancy: true },
        });
        if (!application)
            throw new NotFoundException('application_not_found');
        const membership = await prisma.membership.findUnique({
            where: { organizationId_userId: { organizationId: application.vacancy.organizationId, userId: evaluatorId } },
        });
        if (!membership)
            throw new ForbiddenException('user_not_member_of_org');
        const evaluation = await prisma.evaluation.create({ data: { applicationId, evaluatorId, comment } });
        await prisma.auditEvent.create({
            data: {
                actorId: evaluatorId,
                action: 'evaluation.created',
                entityType: 'Application',
                entityId: applicationId,
                metadata: { evaluationId: evaluation.id },
            },
        });
        return evaluation;
    }
};
EvaluationsService = __decorate([
    Injectable()
], EvaluationsService);
export { EvaluationsService };
//# sourceMappingURL=evaluations.service.js.map
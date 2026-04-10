var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import { EmailGateway } from '../integrations/email.gateway.js';
let CandidatesService = class CandidatesService {
    emailGateway;
    constructor(emailGateway) {
        this.emailGateway = emailGateway;
    }
    async invite(organizationId, email, vacancyId, actorUserId) {
        const membership = await prisma.membership.findUnique({
            where: { organizationId_userId: { organizationId, userId: actorUserId } },
        });
        if (!membership)
            throw new ForbiddenException('user_not_member_of_org');
        const candidate = await prisma.candidate.upsert({
            where: { email },
            update: {},
            create: { email, organizationId, token: randomUUID(), invitedByUserId: actorUserId },
        });
        await prisma.guestSession.upsert({
            where: { token: candidate.token },
            update: { candidateId: candidate.id, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
            create: { candidateId: candidate.id, token: candidate.token, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        });
        await prisma.candidateOnboardingSession.upsert({
            where: { candidateId: candidate.id },
            update: {},
            create: { candidateId: candidate.id },
        });
        await prisma.application.upsert({
            where: { candidateId_vacancyId: { candidateId: candidate.id, vacancyId } },
            update: {},
            create: { candidateId: candidate.id, vacancyId },
        });
        await this.emailGateway.sendTemplated({
            tenantId: organizationId,
            to: email,
            templateKey: 'candidate-invite',
            templateVersion: 'v1',
            payload: { token: candidate.token, vacancyId },
            correlationId: candidate.id,
        });
        await prisma.auditEvent.create({
            data: { action: 'candidate.invited', actorId: actorUserId, entityType: 'candidate', entityId: candidate.id, metadata: { vacancyId } },
        });
        return candidate;
    }
    byToken(token) {
        return prisma.candidate.findUnique({
            where: { token },
            include: { onboarding: true, profile: true, guestSession: true },
        });
    }
};
CandidatesService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [EmailGateway])
], CandidatesService);
export { CandidatesService };
//# sourceMappingURL=candidates.service.js.map
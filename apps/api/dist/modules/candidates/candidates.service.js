var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
let CandidatesService = class CandidatesService {
    async invite(organizationId, email, vacancyId) {
        const candidate = await prisma.candidate.upsert({
            where: { email },
            update: {},
            create: { email, organizationId, token: randomUUID() },
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
        await prisma.messageDispatch.create({
            data: { channel: 'email-mock', destination: email, content: `Use token ${candidate.token}` },
        });
        await prisma.auditEvent.create({
            data: { action: 'candidate.invited', entityType: 'candidate', entityId: candidate.id, metadata: { vacancyId } },
        });
        return candidate;
    }
    byToken(token) {
        return prisma.candidate.findUnique({
            where: { token },
            include: { onboarding: true, profile: true },
        });
    }
};
CandidatesService = __decorate([
    Injectable()
], CandidatesService);
export { CandidatesService };
//# sourceMappingURL=candidates.service.js.map
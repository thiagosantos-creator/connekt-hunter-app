var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
let OnboardingService = class OnboardingService {
    async basic(token, fullName, phone) {
        const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
        await prisma.candidateProfile.upsert({
            where: { candidateId: candidate.id },
            update: { fullName, phone },
            create: { candidateId: candidate.id, fullName, phone },
        });
        await prisma.candidateOnboardingSession.update({
            where: { candidateId: candidate.id },
            data: { basicCompleted: true },
        });
        return { ok: true };
    }
    async consent(token) {
        const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
        const session = await prisma.candidateOnboardingSession.findUniqueOrThrow({
            where: { candidateId: candidate.id },
        });
        await prisma.candidateConsent.createMany({
            data: [
                { sessionId: session.id, type: 'lgpd', accepted: true },
                { sessionId: session.id, type: 'terms', accepted: true },
            ],
        });
        await prisma.candidateOnboardingSession.update({
            where: { candidateId: candidate.id },
            data: { consentCompleted: true },
        });
        return { ok: true };
    }
    async resume(token, filename) {
        const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
        const session = await prisma.candidateOnboardingSession.findUniqueOrThrow({
            where: { candidateId: candidate.id },
        });
        const resume = await prisma.candidateResume.create({
            data: { sessionId: session.id, objectKey: `cv/${candidate.id}/${filename}`, provider: 'minio' },
        });
        await prisma.outboxEvent.create({ data: { topic: 'resume.uploaded', payload: { resumeId: resume.id } } });
        await prisma.candidateOnboardingSession.update({
            where: { candidateId: candidate.id },
            data: { resumeCompleted: true, status: 'completed' },
        });
        return resume;
    }
};
OnboardingService = __decorate([
    Injectable()
], OnboardingService);
export { OnboardingService };
//# sourceMappingURL=onboarding.service.js.map
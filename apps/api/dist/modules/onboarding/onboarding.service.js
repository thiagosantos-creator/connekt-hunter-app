var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OnboardingService_1;
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { StorageGateway } from '../integrations/storage.gateway.js';
import { CvParserGateway } from '../integrations/cv-parser.gateway.js';
let OnboardingService = OnboardingService_1 = class OnboardingService {
    storageGateway;
    cvParserGateway;
    logger = new Logger(OnboardingService_1.name);
    constructor(storageGateway, cvParserGateway) {
        this.storageGateway = storageGateway;
        this.cvParserGateway = cvParserGateway;
    }
    async basic(token, fullName, phone) {
        const candidate = await prisma.candidate.findUnique({ where: { token } });
        if (!candidate)
            throw new NotFoundException('candidate_not_found');
        await prisma.candidateProfile.upsert({
            where: { candidateId: candidate.id },
            update: { fullName, phone },
            create: { candidateId: candidate.id, fullName, phone },
        });
        await prisma.candidateOnboardingSession.update({
            where: { candidateId: candidate.id },
            data: { basicCompleted: true },
        });
        await prisma.auditEvent.create({
            data: {
                actorId: candidate.id,
                action: 'onboarding.basic_completed',
                entityType: 'Candidate',
                entityId: candidate.id,
                metadata: { organizationId: candidate.organizationId },
            },
        });
        this.logger.log(JSON.stringify({ event: 'onboarding_basic_completed', candidateId: candidate.id }));
        return { ok: true };
    }
    async consent(token) {
        const candidate = await prisma.candidate.findUnique({ where: { token } });
        if (!candidate)
            throw new NotFoundException('candidate_not_found');
        const session = await prisma.candidateOnboardingSession.findUnique({
            where: { candidateId: candidate.id },
        });
        if (!session)
            throw new NotFoundException('onboarding_session_not_found');
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
        await prisma.auditEvent.create({
            data: {
                actorId: candidate.id,
                action: 'onboarding.consent_completed',
                entityType: 'Candidate',
                entityId: candidate.id,
                metadata: { organizationId: candidate.organizationId },
            },
        });
        this.logger.log(JSON.stringify({ event: 'onboarding_consent_completed', candidateId: candidate.id }));
        return { ok: true };
    }
    async resume(token, filename) {
        const candidate = await prisma.candidate.findUnique({ where: { token } });
        if (!candidate)
            throw new NotFoundException('candidate_not_found');
        const session = await prisma.candidateOnboardingSession.findUnique({
            where: { candidateId: candidate.id },
        });
        if (!session)
            throw new NotFoundException('onboarding_session_not_found');
        const upload = await this.storageGateway.createPresignedUpload({
            tenantId: candidate.organizationId,
            namespace: `candidate-cv/${candidate.id}`,
            filename,
            metadata: { source: 'candidate-onboarding' },
        });
        const resume = await prisma.candidateResume.create({
            data: { sessionId: session.id, objectKey: upload.objectKey, provider: upload.provider },
        });
        await this.storageGateway.recordAsset({
            tenantId: candidate.organizationId,
            objectKey: upload.objectKey,
            category: 'resume-cv',
            provider: upload.provider,
            metadata: { candidateId: candidate.id, sessionId: session.id },
        });
        const parsed = await this.cvParserGateway.parseResume({
            resumeId: resume.id,
            objectKey: resume.objectKey,
            candidateId: candidate.id,
        });
        await prisma.resumeParseResult.upsert({
            where: { resumeId: resume.id },
            update: { status: 'parsed', parsedJson: parsed },
            create: { resumeId: resume.id, status: 'parsed', parsedJson: parsed },
        });
        await prisma.outboxEvent.create({ data: { topic: 'resume.uploaded', payload: { resumeId: resume.id } } });
        await prisma.candidateOnboardingSession.update({
            where: { candidateId: candidate.id },
            data: { resumeCompleted: true, status: 'completed' },
        });
        await prisma.auditEvent.create({
            data: {
                actorId: candidate.id,
                action: 'onboarding.resume_completed',
                entityType: 'Candidate',
                entityId: candidate.id,
                metadata: { organizationId: candidate.organizationId, resumeId: resume.id },
            },
        });
        this.logger.log(JSON.stringify({ event: 'onboarding_resume_completed', candidateId: candidate.id, resumeId: resume.id }));
        return { ...resume, upload };
    }
};
OnboardingService = OnboardingService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [StorageGateway,
        CvParserGateway])
], OnboardingService);
export { OnboardingService };
//# sourceMappingURL=onboarding.service.js.map
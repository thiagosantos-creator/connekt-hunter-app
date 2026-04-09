import { OnboardingService } from './onboarding.service.js';
export declare class OnboardingController {
    private readonly onboardingService;
    constructor(onboardingService: OnboardingService);
    basic(body: {
        token: string;
        fullName: string;
        phone: string;
    }): Promise<{
        ok: boolean;
    }>;
    consent(body: {
        token: string;
    }): Promise<{
        ok: boolean;
    }>;
    resume(body: {
        token: string;
        filename: string;
    }): Promise<{
        id: string;
        status: string;
        objectKey: string;
        provider: string;
        uploadedAt: Date;
        sessionId: string;
    }>;
}

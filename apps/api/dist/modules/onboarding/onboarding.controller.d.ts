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
        upload: import("../integrations/storage.gateway.js").PresignedUpload;
        id: string;
        provider: string;
        status: string;
        objectKey: string;
        uploadedAt: Date;
        sessionId: string;
    }>;
}

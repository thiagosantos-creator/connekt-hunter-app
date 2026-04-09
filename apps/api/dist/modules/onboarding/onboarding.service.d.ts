export declare class OnboardingService {
    basic(token: string, fullName: string, phone: string): Promise<{
        ok: boolean;
    }>;
    consent(token: string): Promise<{
        ok: boolean;
    }>;
    resume(token: string, filename: string): Promise<{
        id: string;
        status: string;
        objectKey: string;
        provider: string;
        uploadedAt: Date;
        sessionId: string;
    }>;
}

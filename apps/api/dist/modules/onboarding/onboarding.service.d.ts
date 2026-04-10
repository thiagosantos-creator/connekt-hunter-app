import { StorageGateway } from '../integrations/storage.gateway.js';
import { CvParserGateway } from '../integrations/cv-parser.gateway.js';
export declare class OnboardingService {
    private readonly storageGateway;
    private readonly cvParserGateway;
    private readonly logger;
    constructor(storageGateway: StorageGateway, cvParserGateway: CvParserGateway);
    basic(token: string, fullName: string, phone: string): Promise<{
        ok: boolean;
    }>;
    consent(token: string): Promise<{
        ok: boolean;
    }>;
    resume(token: string, filename: string): Promise<{
        upload: import("../integrations/storage.gateway.js").PresignedUpload;
        id: string;
        provider: string;
        status: string;
        objectKey: string;
        uploadedAt: Date;
        sessionId: string;
    }>;
}

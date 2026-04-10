import { IntegrationsHealthService } from '../integrations/integrations-health.service.js';
export declare class HealthController {
    private readonly integrationsHealth;
    constructor(integrationsHealth: IntegrationsHealthService);
    health(): Promise<{
        environment: string;
        integrations: {
            storage: string;
            email: string;
            auth: string;
            ai: string;
            cvParser: string;
            transcription: string;
        };
        status: string;
        service: string;
    }>;
}

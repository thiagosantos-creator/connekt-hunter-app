export declare class HealthController {
    health(): Promise<{
        status: string;
        service: string;
    }>;
}

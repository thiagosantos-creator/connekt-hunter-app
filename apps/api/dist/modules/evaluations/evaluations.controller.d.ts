import { EvaluationsService } from './evaluations.service.js';
import type { AuthUser } from '../auth/auth.types.js';
export declare class EvaluationsController {
    private readonly evaluationsService;
    constructor(evaluationsService: EvaluationsService);
    create(body: {
        applicationId: string;
        comment: string;
    }, user: AuthUser): Promise<{
        id: string;
        createdAt: Date;
        applicationId: string;
        comment: string;
        evaluatorId: string;
    }>;
}

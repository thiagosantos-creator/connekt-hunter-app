import { ClientDecisionsService } from './client-decisions.service.js';
import type { AuthUser } from '../auth/auth.types.js';
export declare class ClientDecisionsController {
    private readonly clientDecisionsService;
    constructor(clientDecisionsService: ClientDecisionsService);
    create(body: {
        shortlistItemId: string;
        decision: string;
    }, user: AuthUser): Promise<{
        id: string;
        createdAt: Date;
        decision: string;
        shortlistItemId: string;
        reviewerId: string;
    }>;
}

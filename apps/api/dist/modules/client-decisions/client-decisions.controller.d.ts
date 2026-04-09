import { ClientDecisionsService } from './client-decisions.service.js';
export declare class ClientDecisionsController {
    private readonly clientDecisionsService;
    constructor(clientDecisionsService: ClientDecisionsService);
    create(body: {
        shortlistItemId: string;
        reviewerId: string;
        decision: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        decision: string;
        shortlistItemId: string;
        reviewerId: string;
    }>;
}

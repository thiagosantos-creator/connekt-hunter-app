import { ShortlistService } from './shortlist.service.js';
export declare class ShortlistController {
    private readonly shortlistService;
    constructor(shortlistService: ShortlistService);
    add(body: {
        applicationId: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        shortlistId: string;
        applicationId: string;
    }>;
}

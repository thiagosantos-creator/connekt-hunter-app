import { ShortlistService } from './shortlist.service.js';
import type { AuthUser } from '../auth/auth.types.js';
export declare class ShortlistController {
    private readonly shortlistService;
    constructor(shortlistService: ShortlistService);
    add(body: {
        applicationId: string;
    }, user: AuthUser): Promise<{
        id: string;
        createdAt: Date;
        shortlistId: string;
        applicationId: string;
    }>;
}

export declare class ClientDecisionsService {
    create(shortlistItemId: string, reviewerId: string, decision: string): Promise<{
        id: string;
        createdAt: Date;
        decision: string;
        shortlistItemId: string;
        reviewerId: string;
    }>;
}

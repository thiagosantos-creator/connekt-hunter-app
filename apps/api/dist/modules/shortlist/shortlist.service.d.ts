export declare class ShortlistService {
    addToShortlist(applicationId: string, actorId?: string): Promise<{
        id: string;
        createdAt: Date;
        shortlistId: string;
        applicationId: string;
    }>;
}

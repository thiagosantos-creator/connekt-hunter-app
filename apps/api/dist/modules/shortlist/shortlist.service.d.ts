export declare class ShortlistService {
    addToShortlist(applicationId: string): Promise<{
        id: string;
        createdAt: Date;
        shortlistId: string;
        applicationId: string;
    }>;
}

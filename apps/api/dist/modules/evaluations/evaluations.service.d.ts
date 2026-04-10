export declare class EvaluationsService {
    create(applicationId: string, evaluatorId: string, comment: string): Promise<{
        id: string;
        createdAt: Date;
        applicationId: string;
        comment: string;
        evaluatorId: string;
    }>;
}

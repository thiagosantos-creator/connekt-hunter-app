import { EvaluationsService } from './evaluations.service.js';
export declare class EvaluationsController {
    private readonly evaluationsService;
    constructor(evaluationsService: EvaluationsService);
    create(body: {
        applicationId: string;
        evaluatorId: string;
        comment: string;
    }): import("@prisma/client").Prisma.Prisma__EvaluationClient<{
        id: string;
        createdAt: Date;
        applicationId: string;
        comment: string;
        evaluatorId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}

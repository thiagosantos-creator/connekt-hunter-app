import { VacanciesService } from './vacancies.service.js';
import type { AuthUser } from '../auth/auth.types.js';
export declare class VacanciesController {
    private readonly vacanciesService;
    constructor(vacanciesService: VacanciesService);
    create(body: {
        organizationId: string;
        title: string;
        description: string;
    }, user: AuthUser): Promise<{
        id: string;
        createdAt: Date;
        organizationId: string;
        title: string;
        description: string;
        createdBy: string;
    }>;
    findAll(user: AuthUser): import("@prisma/client").Prisma.PrismaPromise<({
        organization: {
            id: string;
            name: string;
            createdAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        organizationId: string;
        title: string;
        description: string;
        createdBy: string;
    })[]>;
}

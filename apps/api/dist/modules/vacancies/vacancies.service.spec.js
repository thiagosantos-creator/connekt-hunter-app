import { vi, describe, it, expect, beforeEach } from 'vitest';
vi.mock('@connekt/db', () => ({
    prisma: {
        membership: { findUnique: vi.fn() },
        vacancy: {
            create: vi.fn(),
            findMany: vi.fn(),
        },
    },
}));
import { VacanciesService } from './vacancies.service.js';
import { prisma } from '@connekt/db';
describe('VacanciesService', () => {
    let service;
    beforeEach(() => {
        service = new VacanciesService();
        vi.clearAllMocks();
    });
    it('creates a vacancy', async () => {
        const vacancy = { id: 'v1', title: 'Engineer', description: 'Test', organizationId: 'org1', createdBy: 'u1' };
        vi.mocked(prisma.membership.findUnique).mockResolvedValue({ organizationId: 'org1', userId: 'u1' });
        vi.mocked(prisma.vacancy.create).mockResolvedValue(vacancy);
        const result = await service.create({ organizationId: 'org1', title: 'Engineer', description: 'Test', createdBy: 'u1' });
        expect(result).toEqual(vacancy);
        expect(prisma.vacancy.create).toHaveBeenCalledOnce();
    });
    it('lists vacancies', async () => {
        vi.mocked(prisma.vacancy.findMany).mockResolvedValue([]);
        const result = await service.findAll(['org1']);
        expect(result).toEqual([]);
    });
});
//# sourceMappingURL=vacancies.service.spec.js.map
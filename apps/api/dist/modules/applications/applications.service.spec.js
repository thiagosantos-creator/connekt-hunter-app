import { vi, describe, it, expect, beforeEach } from 'vitest';
vi.mock('@connekt/db', () => ({
    prisma: {
        application: {
            findMany: vi.fn(),
        },
    },
}));
import { ApplicationsService } from './applications.service.js';
import { prisma } from '@connekt/db';
describe('ApplicationsService', () => {
    let service;
    beforeEach(() => {
        service = new ApplicationsService();
        vi.clearAllMocks();
    });
    it('lists all applications', async () => {
        vi.mocked(prisma.application.findMany).mockResolvedValue([]);
        const result = await service.findAll(['org_demo']);
        expect(result).toEqual([]);
        expect(prisma.application.findMany).toHaveBeenCalledWith({
            where: { vacancy: { organizationId: { in: ['org_demo'] } } },
            include: { candidate: true, vacancy: true },
        });
    });
});
//# sourceMappingURL=applications.service.spec.js.map
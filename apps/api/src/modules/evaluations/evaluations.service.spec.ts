import { describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    application: {
      findUnique: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    },
    evaluation: {
      create: vi.fn().mockResolvedValue({ id: 'e1', applicationId: 'a1', evaluatorId: 'u1', comment: 'ok' }),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { EvaluationsService } from './evaluations.service.js';
import { prisma } from '@connekt/db';

describe('EvaluationsService', () => {
  const service = new EvaluationsService();

  it('should throw NotFoundException when application does not exist', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue(null);
    await expect(service.create('a1', 'u1', 'comment')).rejects.toThrow('application_not_found');
  });

  it('should throw ForbiddenException when evaluator is not a member of the org', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'a1',
      vacancy: { organizationId: 'org1' },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    await expect(service.create('a1', 'u1', 'comment')).rejects.toThrow('user_not_member_of_org');
  });

  it('should create evaluation and audit event when valid', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'a1',
      vacancy: { organizationId: 'org1' },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
    const result = await service.create('a1', 'u1', 'comment');
    expect(result).toBeDefined();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'evaluation.created' }) }),
    );
  });
});

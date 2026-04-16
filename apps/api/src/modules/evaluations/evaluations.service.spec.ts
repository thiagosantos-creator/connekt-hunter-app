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
      create: vi.fn().mockResolvedValue({
        id: 'e1',
        applicationId: 'a1',
        evaluatorId: 'u1',
        comment: 'ok',
        ratingTechnical: 4,
        ratingBehavioral: 5,
        ratingInterviewer: 3,
        ratingAi: 4,
        overallRating: 75,
      }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 'e1', comment: 'updated' }),
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

  it('should compute overallRating from ratings and include in audit metadata', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'a1',
      vacancy: { organizationId: 'org1' },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
    await service.create('a1', 'u1', 'comment', {
      ratingTechnical: 4,
      ratingBehavioral: 5,
      ratingInterviewer: 3,
      ratingAi: 4,
    });
    expect(prisma.evaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ratingTechnical: 4,
          ratingBehavioral: 5,
          ratingInterviewer: 3,
          ratingAi: 4,
        }),
      }),
    );
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'evaluation.created',
          metadata: expect.objectContaining({ overallRating: expect.any(Number) }),
        }),
      }),
    );
  });

  it('should not include overallRating when no ratings are provided', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'a1',
      vacancy: { organizationId: 'org1' },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
    await service.create('a1', 'u1', 'comment only');
    expect(prisma.evaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ overallRating: undefined }),
      }),
    );
  });

  it('findByApplication should throw NotFoundException when application does not exist', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue(null);
    await expect(service.findByApplication('a1', 'u1')).rejects.toThrow('application_not_found');
  });

  it('findByApplication should return evaluations for valid application', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'a1',
      vacancy: { organizationId: 'org1' },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
    vi.mocked(prisma.evaluation.findMany).mockResolvedValue([{ id: 'e1' }] as never);
    const result = await service.findByApplication('a1', 'u1');
    expect(result).toHaveLength(1);
  });

  it('update should throw NotFoundException when evaluation does not exist', async () => {
    vi.mocked(prisma.evaluation.findUnique).mockResolvedValue(null);
    await expect(service.update('e1', 'u1', 'updated')).rejects.toThrow('evaluation_not_found');
  });

  it('update should update evaluation and create audit event', async () => {
    vi.mocked(prisma.evaluation.findUnique).mockResolvedValue({
      id: 'e1',
      applicationId: 'a1',
      application: { vacancy: { organizationId: 'org1' } },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
    const result = await service.update('e1', 'u1', 'updated comment');
    expect(result).toBeDefined();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'evaluation.updated' }) }),
    );
  });
});

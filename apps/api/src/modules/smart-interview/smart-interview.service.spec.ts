import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';

vi.mock('@connekt/db', () => ({
  prisma: {
    smartInterviewTemplate: { findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    smartInterviewQuestion: { deleteMany: vi.fn(), createMany: vi.fn() },
    application: { findUnique: vi.fn() },
    membership: { findUnique: vi.fn() },
    smartInterviewSession: { upsert: vi.fn(), findUnique: vi.fn() },
  },
}));

import { prisma } from '@connekt/db';
import { SmartInterviewService } from './smart-interview.service.js';

describe('SmartInterviewService', () => {
  let service: SmartInterviewService;

  beforeEach(() => {
    service = new SmartInterviewService();
    vi.clearAllMocks();
  });

  it('generates mock AI questions', async () => {
    vi.mocked(prisma.smartInterviewTemplate.findUnique).mockResolvedValue({ id: 'tpl_1' } as never);
    vi.mocked(prisma.smartInterviewTemplate.update).mockResolvedValue({ id: 'tpl_1', questions: [] } as never);

    await service.generateQuestions('tpl_1');

    expect(prisma.smartInterviewQuestion.deleteMany).toHaveBeenCalledWith({ where: { templateId: 'tpl_1' } });
    expect(prisma.smartInterviewQuestion.createMany).toHaveBeenCalled();
    expect(prisma.smartInterviewTemplate.update).toHaveBeenCalledWith({
      where: { id: 'tpl_1' },
      data: { status: 'ready' },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
  });

  it('creates/upserts session by application', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'app_1',
      vacancyId: 'vac_1',
      vacancy: { id: 'vac_1', organizationId: 'org_1' },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ organizationId: 'org_1', userId: 'user_1' } as never);
    vi.mocked(prisma.smartInterviewTemplate.findUnique).mockResolvedValue({ id: 'tpl_1' } as never);
    vi.mocked(prisma.smartInterviewSession.upsert).mockResolvedValue({ id: 'si_1' } as never);

    await service.createSession({ applicationId: 'app_1', createdBy: 'user_1' });
    expect(prisma.smartInterviewSession.upsert).toHaveBeenCalled();
  });

  it('rejects session creation for users outside vacancy tenant', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({
      id: 'app_1',
      vacancyId: 'vac_1',
      vacancy: { id: 'vac_1', organizationId: 'org_1' },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);

    await expect(service.createSession({ applicationId: 'app_1', createdBy: 'user_2' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires matching public token for candidate upload presign', async () => {
    vi.mocked(prisma.smartInterviewSession.findUnique).mockResolvedValue({
      id: 'si_1',
      publicToken: 'si-good',
      applicationId: 'app_1',
      application: { candidateId: 'cand_1' },
    } as never);

    await expect(service.createPresignedUpload({ sessionId: 'si_1', questionId: 'q_1', publicToken: 'si-bad' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

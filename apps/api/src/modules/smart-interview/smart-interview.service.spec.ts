import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    smartInterviewTemplate: { findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    smartInterviewQuestion: { deleteMany: vi.fn(), createMany: vi.fn() },
    application: { findUnique: vi.fn() },
    smartInterviewSession: { upsert: vi.fn() },
  },
}));

import { prisma } from '@connekt/db';
import { SmartInterviewService } from './smart-interview.service.js';

describe('SmartInterviewService', () => {
  let service: SmartInterviewService;

  beforeEach(() => {
    service = new SmartInterviewService(
      { generateInterviewQuestions: vi.fn().mockResolvedValue({ questions: ['Q1', 'Q2', 'Q3'], provider: 'ai-mock' }) } as never,
      {} as never,
      {} as never,
    );
    vi.clearAllMocks();
  });

  it('generates AI questions through gateway', async () => {
    vi.mocked(prisma.smartInterviewTemplate.findUnique).mockResolvedValue({ id: 'tpl_1', configJson: {} } as never);
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
    vi.mocked(prisma.application.findUnique).mockResolvedValue({ id: 'app_1', vacancyId: 'vac_1', vacancy: { id: 'vac_1' } } as never);
    vi.mocked(prisma.smartInterviewTemplate.findUnique).mockResolvedValue({ id: 'tpl_1' } as never);
    vi.mocked(prisma.smartInterviewSession.upsert).mockResolvedValue({ id: 'si_1' } as never);

    await service.createSession({ applicationId: 'app_1' });
    expect(prisma.smartInterviewSession.upsert).toHaveBeenCalled();
  });
});

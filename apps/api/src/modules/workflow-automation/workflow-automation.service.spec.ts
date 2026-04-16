import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    candidate: { findUnique: vi.fn() },
    vacancy: { findUnique: vi.fn() },
    membership: { findUnique: vi.fn() },
    user: { findUnique: vi.fn().mockResolvedValue(null) },
    workflowSuggestion: { updateMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    matchingScore: { findUnique: vi.fn().mockResolvedValue(null) },
    riskEvaluation: { findUnique: vi.fn().mockResolvedValue(null) },
    application: { findFirst: vi.fn().mockResolvedValue(null) },
    auditEvent: { create: vi.fn() },
    automationExecution: { create: vi.fn() },
  },
}));

import { prisma } from '@connekt/db';
import { WorkflowAutomationService } from './workflow-automation.service.js';

describe('WorkflowAutomationService', () => {
  let service: WorkflowAutomationService;

  beforeEach(() => {
    service = new WorkflowAutomationService();
    vi.clearAllMocks();
  });

  it('rejects suggest when candidate and vacancy are from different tenants', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'cand_1', organizationId: 'org_a' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'vac_1', organizationId: 'org_b' } as never);

    await expect(service.suggest('cand_1', 'vac_1', 'user_1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects execute when suggestion is not pending', async () => {
    vi.mocked(prisma.workflowSuggestion.findUnique).mockResolvedValue({
      id: 'ws_1',
      status: 'approved',
      vacancy: { organizationId: 'org_1' },
    } as never);

    await expect(service.execute('ws_1', 'user_1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects execute when actor is not member of suggestion tenant', async () => {
    vi.mocked(prisma.workflowSuggestion.findUnique).mockResolvedValue({
      id: 'ws_1',
      status: 'pending',
      vacancy: { organizationId: 'org_1' },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'headhunter' } as never);

    await expect(service.execute('ws_1', 'user_2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows global admin suggest without membership', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'admin' } as never);
    vi.mocked(prisma.matchingScore.findUnique).mockResolvedValue({ score: 70 } as never);
    vi.mocked(prisma.riskEvaluation.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ status: 'applied', smartInterviewSessions: [] } as never);
    vi.mocked(prisma.workflowSuggestion.create).mockResolvedValue({ id: 'ws1', suggestionType: 'schedule-interview' } as never);

    const result = await service.suggest('c1', 'v1', 'admin-user');
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('suggests schedule-interview when match score >= 60 and no interview exists', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
    vi.mocked(prisma.matchingScore.findUnique).mockResolvedValue({ score: 70 } as never);
    vi.mocked(prisma.riskEvaluation.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ status: 'applied', smartInterviewSessions: [] } as never);
    vi.mocked(prisma.workflowSuggestion.create).mockResolvedValue({ id: 'ws1', suggestionType: 'schedule-interview' } as never);

    const result = await service.suggest('c1', 'v1', 'u1');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(prisma.workflowSuggestion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ suggestionType: 'schedule-interview' }) }),
    );
  });

  it('supersedes previous suggestions instead of deleting', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
    vi.mocked(prisma.matchingScore.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.application.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.workflowSuggestion.create).mockResolvedValue({ id: 'ws1' } as never);

    await service.suggest('c1', 'v1', 'u1');
    expect(prisma.workflowSuggestion.updateMany).toHaveBeenCalledWith({
      where: { candidateId: 'c1', vacancyId: 'v1', status: 'pending' },
      data: { status: 'superseded' },
    });
  });

  it('suggests advance-to-shortlist when high match, low risk, and has interview', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);
    vi.mocked(prisma.matchingScore.findUnique).mockResolvedValue({ score: 85 } as never);
    vi.mocked(prisma.riskEvaluation.findUnique).mockResolvedValue({ riskScore: 0.1, requiresReview: false } as never);
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ status: 'interview', smartInterviewSessions: [{ id: 'si1' }] } as never);
    vi.mocked(prisma.workflowSuggestion.create).mockResolvedValue({ id: 'ws1', suggestionType: 'advance-to-shortlist' } as never);

    const result = await service.suggest('c1', 'v1', 'u1');
    const types = result.map(() => 'advance-to-shortlist');
    expect(prisma.workflowSuggestion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ suggestionType: 'advance-to-shortlist' }) }),
    );
  });
});

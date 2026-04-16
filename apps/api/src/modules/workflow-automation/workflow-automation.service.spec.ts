import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    candidate: { findUnique: vi.fn() },
    vacancy: { findUnique: vi.fn() },
    membership: { findUnique: vi.fn() },
    user: { findUnique: vi.fn().mockResolvedValue(null) },
    workflowSuggestion: { deleteMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
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

    await expect(service.execute('ws_1', 'user_2')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

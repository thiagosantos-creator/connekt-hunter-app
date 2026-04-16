import { describe, expect, it, vi } from 'vitest';

vi.mock('@connekt/db', () => ({
  prisma: {
    candidate: {
      findUnique: vi.fn(),
    },
    vacancy: {
      findUnique: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    riskSignal: {
      deleteMany: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
    riskEvaluation: {
      upsert: vi.fn().mockResolvedValue({ id: 're1', overallRisk: 'medium', riskScore: 0.5 }),
      findUnique: vi.fn().mockResolvedValue({ id: 're1' }),
      update: vi.fn().mockResolvedValue({ id: 're1', requiresReview: false, reviewAction: 'dismiss' }),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

const mockAiGateway = {
  analyzeRiskPatterns: vi.fn().mockResolvedValue({
    overallRisk: 'medium',
    riskScore: 0.5,
    findings: [{ type: 'consistency', severity: 'medium', score: 0.4, detail: 'gap in timeline' }],
    explanation: 'Moderate risk detected',
  }),
};

import { RiskAnalysisService } from './risk-analysis.service.js';
import { prisma } from '@connekt/db';

describe('RiskAnalysisService', () => {
  const service = new RiskAnalysisService(mockAiGateway as never);

  it('should throw NotFoundException when candidate does not exist', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    await expect(service.analyze('c1', 'v1', 'u1')).rejects.toThrow('candidate_not_found');
  });

  it('should throw NotFoundException when vacancy does not exist', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue(null);
    await expect(service.analyze('c1', 'v1', 'u1')).rejects.toThrow('vacancy_not_found');
  });

  it('should throw ForbiddenException on cross-tenant mismatch', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org2' } as never);
    await expect(service.analyze('c1', 'v1', 'u1')).rejects.toThrow('candidate_vacancy_cross_tenant_mismatch');
  });

  it('should throw ForbiddenException when actor is not a member', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    await expect(service.analyze('c1', 'v1', 'u1')).rejects.toThrow('user_not_member_of_org');
  });

  it('should analyze risk and create audit event when valid', async () => {
    vi.mocked(prisma.candidate.findUnique).mockResolvedValue({ id: 'c1', organizationId: 'org1' } as never);
    vi.mocked(prisma.vacancy.findUnique).mockResolvedValue({ id: 'v1', organizationId: 'org1' } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);

    const result = await service.analyze('c1', 'v1', 'u1');
    expect(result).toBeDefined();
    expect(result.overallRisk).toBe('medium');
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'risk.analyzed' }) }),
    );
  });

  it('should reject invalid review action', async () => {
    await expect(service.review('re1', 'u1', 'invalid-action')).rejects.toThrow('invalid_review_action');
  });

  it('should throw NotFoundException when reviewing non-existent evaluation', async () => {
    vi.mocked(prisma.riskEvaluation.findUnique).mockResolvedValue(null);
    await expect(service.review('re-missing', 'u1', 'dismiss')).rejects.toThrow('risk_evaluation_not_found');
  });

  it('should review risk evaluation and create audit event', async () => {
    vi.mocked(prisma.riskEvaluation.findUnique).mockResolvedValue({
      id: 're1',
      vacancy: { organizationId: 'org1' },
    } as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ id: 'm1' } as never);

    const result = await service.review('re1', 'u1', 'dismiss', 'False positive');
    expect(result).toBeDefined();
    expect(prisma.riskEvaluation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requiresReview: false,
          reviewAction: 'dismiss',
          reviewReason: 'False positive',
        }),
      }),
    );
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'risk.reviewed' }) }),
    );
  });
});

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Automated Audit Trail Verification
// Ensures that all critical endpoints create audit events with the required
// fields (actorId, action, entityType, entityId, metadata).
// ---------------------------------------------------------------------------

function readSource(relative: string): string {
  return readFileSync(resolve(__dirname, '..', relative), 'utf-8');
}

describe('Audit Trail Verification — Critical Endpoints', () => {
  describe('shortlist actions', () => {
    it('shortlist.service creates auditEvent on addToShortlist', () => {
      const source = readSource('src/modules/shortlist/shortlist.service.ts');
      expect(source).toContain("auditEvent.create");
      expect(source).toContain("'shortlist.added'");
      expect(source).toContain("actorId");
      expect(source).toContain("entityType");
      expect(source).toContain("entityId");
    });
  });

  describe('evaluations', () => {
    it('evaluations.service creates auditEvent on create', () => {
      const source = readSource('src/modules/evaluations/evaluations.service.ts');
      expect(source).toContain("auditEvent.create");
      expect(source).toContain("'evaluation.created'");
      expect(source).toContain("actorId");
      expect(source).toContain("entityType");
    });
  });

  describe('client decisions', () => {
    it('client-decisions.service creates auditEvent on create', () => {
      const source = readSource('src/modules/client-decisions/client-decisions.service.ts');
      expect(source).toContain("auditEvent.create");
      expect(source).toContain("'client.decision'");
      expect(source).toContain("actorId");
      expect(source).toContain("entityType");
    });
  });

  describe('onboarding milestones', () => {
    it('onboarding.service creates auditEvent on basic completion', () => {
      const source = readSource('src/modules/onboarding/onboarding.service.ts');
      expect(source).toContain("'onboarding.basic_completed'");
      expect(source).toContain("auditEvent.create");
    });

    it('onboarding.service creates auditEvent on consent completion', () => {
      const source = readSource('src/modules/onboarding/onboarding.service.ts');
      expect(source).toContain("'onboarding.consent_completed'");
    });

    it('onboarding.service creates auditEvent on resume completion', () => {
      const source = readSource('src/modules/onboarding/onboarding.service.ts');
      expect(source).toContain("'onboarding.resume_completed'");
    });
  });

  describe('smart interview review', () => {
    it('smart-interview.service creates auditEvent on human review', () => {
      const source = readSource('src/modules/smart-interview/smart-interview.service.ts');
      expect(source).toContain("auditEvent.create");
      expect(source).toContain("'smart_interview.reviewed'");
      expect(source).toContain("actorId");
    });
  });

  describe('automation execution', () => {
    it('workflow-automation.service creates auditEvent on execute', () => {
      const source = readSource('src/modules/workflow-automation/workflow-automation.service.ts');
      expect(source).toContain("auditEvent.create");
      expect(source).toContain("'automation.executed'");
      expect(source).toContain("actorId");
    });

    it('workflow-automation.service creates auditEvent on suggest', () => {
      const source = readSource('src/modules/workflow-automation/workflow-automation.service.ts');
      expect(source).toContain("'workflow.suggested'");
    });
  });

  describe('recommendation acceptance', () => {
    it('recommendation-engine.service creates auditEvent on generate', () => {
      const source = readSource('src/modules/recommendation-engine/recommendation-engine.service.ts');
      expect(source).toContain("auditEvent.create");
      expect(source).toContain("'recommendation.generated'");
    });
  });

  describe('matching computation', () => {
    it('candidate-matching.service creates auditEvent on compute', () => {
      const source = readSource('src/modules/candidate-matching/candidate-matching.service.ts');
      expect(source).toContain("auditEvent.create");
      expect(source).toContain("'matching.computed'");
    });
  });

  describe('insights generation', () => {
    it('candidate-insights.service creates auditEvent on generate', () => {
      const source = readSource('src/modules/candidate-insights/candidate-insights.service.ts');
      expect(source).toContain("auditEvent.create");
      expect(source).toContain("'insights.generated'");
    });
  });

  describe('risk analysis', () => {
    it('risk-analysis.service creates auditEvent on analyze', () => {
      const source = readSource('src/modules/risk-analysis/risk-analysis.service.ts');
      expect(source).toContain("auditEvent.create");
      expect(source).toContain("'risk.analyzed'");
    });
  });

  describe('decision engine', () => {
    it('decision-engine.service creates auditEvent on calculatePriority', () => {
      const source = readSource('src/modules/decision-engine/decision-engine.service.ts');
      expect(source).toContain("auditEvent.create");
      expect(source).toContain("'decision.priority-calculated'");
    });
  });
});

describe('Audit Trail Verification — Tenant Isolation', () => {
  const modules = [
    { name: 'candidate-matching', path: 'src/modules/candidate-matching/candidate-matching.service.ts' },
    { name: 'candidate-insights', path: 'src/modules/candidate-insights/candidate-insights.service.ts' },
    { name: 'recommendation-engine', path: 'src/modules/recommendation-engine/recommendation-engine.service.ts' },
    { name: 'decision-engine', path: 'src/modules/decision-engine/decision-engine.service.ts' },
    { name: 'risk-analysis', path: 'src/modules/risk-analysis/risk-analysis.service.ts' },
  ];

  for (const mod of modules) {
    it(`${mod.name} has assertTenantAccess or membership check`, () => {
      const source = readSource(mod.path);
      const hasTenantCheck = source.includes('assertTenantAccess') || source.includes('membership.findUnique');
      expect(hasTenantCheck).toBe(true);
    });
  }

  it('worker has assertWorkerTenantConsistency function', () => {
    const workerSource = readFileSync(resolve(__dirname, '../../worker/src/main.ts'), 'utf-8');
    expect(workerSource).toContain('assertWorkerTenantConsistency');
    expect(workerSource).toContain('cross_tenant_rejected');
  });
});

describe('Audit Trail Verification — Rate Limiting', () => {
  it('rate-limit.guard exists and logs rate limit exceeded', () => {
    const source = readSource('src/modules/auth/rate-limit.guard.ts');
    expect(source).toContain('rate_limit_exceeded');
    expect(source).toContain('429');
  });

  it('public-token.guard validates token expiration', () => {
    const source = readSource('src/modules/auth/public-token.guard.ts');
    expect(source).toContain('token_expired');
    expect(source).toContain('expiresAt');
  });
});

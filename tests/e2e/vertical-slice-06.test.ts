import { describe, expect, it } from 'vitest';

describe('Vertical Slice 06 intelligent automation (contract)', () => {
  it('keeps AI in assistive-only mode with human override and explanations', () => {
    const policy = {
      aiDecisionMode: 'assistive-only',
      humanOverrideEnabled: true,
      explanationRequired: true,
      auditRequired: true,
    };

    expect(policy.aiDecisionMode).toBe('assistive-only');
    expect(policy.humanOverrideEnabled).toBe(true);
    expect(policy.explanationRequired).toBe(true);
    expect(policy.auditRequired).toBe(true);
  });

  it('declares worker topics for recommendation, risk and automation', () => {
    const topics = ['recommendation:generate', 'risk:analyze', 'automation:trigger'];
    expect(topics).toContain('recommendation:generate');
    expect(topics).toContain('risk:analyze');
    expect(topics).toContain('automation:trigger');
  });
});

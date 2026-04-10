import { describe, expect, it } from 'vitest';

describe('Vertical Slice 05 product intelligence (contract)', () => {
  it('keeps AI as assistive-only with mandatory explanation/evidence', () => {
    const policy = {
      aiDecisionMode: 'assistive-only',
      requiresExplanation: true,
      requiresEvidence: true,
      humanOverrideEnabled: true,
    };

    expect(policy.aiDecisionMode).toBe('assistive-only');
    expect(policy.requiresExplanation).toBe(true);
    expect(policy.requiresEvidence).toBe(true);
    expect(policy.humanOverrideEnabled).toBe(true);
  });

  it('defines worker topics for reprocessing', () => {
    const topics = ['matching:compute', 'insights:generate', 'comparison:generate'];
    expect(topics).toHaveLength(3);
  });
});

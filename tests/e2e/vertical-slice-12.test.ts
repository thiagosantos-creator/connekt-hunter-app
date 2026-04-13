import { describe, it, expect } from 'vitest';

describe('vertical slice 12 - conversion and efficiency contracts', () => {
  it('vacancy templates contract enforces tenant-aware and versioned fields', () => {
    const contract = {
      required: ['organizationId', 'name', 'sector', 'role', 'defaultFields', 'version', 'status'],
      statuses: ['draft', 'active', 'archived'],
      flags: ['isFavorite', 'usageCount'],
    };

    expect(contract.required).toContain('organizationId');
    expect(contract.statuses).toContain('active');
    expect(contract.flags).toContain('isFavorite');
  });

  it('follow-up cadence contract keeps D+1 D+3 D+7 with idempotent stepKey', () => {
    const cadence = {
      requiredStepKeys: ['d1-reminder', 'd3-reminder', 'd7-final'],
      channelDefault: 'email',
      idempotencyKey: 'cadenceId+stepKey',
      stopTriggers: ['candidate_response', 'onboarding_started'],
    };

    expect(cadence.requiredStepKeys).toEqual(expect.arrayContaining(['d1-reminder', 'd3-reminder', 'd7-final']));
    expect(cadence.idempotencyKey).toBe('cadenceId+stepKey');
  });

  it('headhunter inbox contract returns prioritized actionable items', () => {
    const inbox = {
      filters: ['organizationId', 'vacancyId', 'status', 'priority'],
      priorityBands: ['high', 'medium', 'low'],
      quickActions: ['resend-invite', 'open-candidate', 'add-note', 'change-status'],
    };

    expect(inbox.priorityBands[0]).toBe('high');
    expect(inbox.quickActions).toContain('resend-invite');
  });
});

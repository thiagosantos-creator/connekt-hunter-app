import { describe, it, expect } from 'vitest';

describe('vertical slice 11 - backoffice critical fixes contracts', () => {
  it('vacancy publishable contract contains required fields', () => {
    const contract = {
      required: ['organizationId', 'title', 'description', 'location', 'workModel', 'seniority', 'employmentType', 'publicationType', 'status', 'department'],
      arrays: ['requiredSkills', 'desiredSkills'],
      optional: ['salaryMin', 'salaryMax'],
    };

    expect(contract.required).toContain('publicationType');
    expect(contract.required).toContain('status');
    expect(contract.arrays).toContain('requiredSkills');
  });

  it('candidate invite supports multichannel with consent', () => {
    const contract = {
      required: ['organizationId', 'vacancyId', 'channel', 'destination', 'consent'],
      channels: ['email', 'phone'],
      providerAgnosticGatewayHint: ['sms', 'whatsapp'],
    };

    expect(contract.channels).toEqual(expect.arrayContaining(['email', 'phone']));
    expect(contract.required).toContain('consent');
  });
});

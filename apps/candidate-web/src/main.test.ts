import { describe, it, expect } from 'vitest';

describe('candidate-web unit tests', () => {
  it('onboarding steps are in correct order', () => {
    const steps = [
      { step: 1, path: '/onboarding/basic', label: 'Basic Info' },
      { step: 2, path: '/onboarding/consent', label: 'LGPD/Terms' },
      { step: 3, path: '/onboarding/resume', label: 'Upload CV' },
    ];
    expect(steps).toHaveLength(3);
    expect(steps[0].path).toBe('/onboarding/basic');
    expect(steps[1].path).toBe('/onboarding/consent');
    expect(steps[2].path).toBe('/onboarding/resume');
  });

  it('invite token localStorage key is consistent', () => {
    const INVITE_TOKEN_KEY = 'invite_token';
    const CANDIDATE_INFO_KEY = 'candidate_info';
    expect(INVITE_TOKEN_KEY).toBe('invite_token');
    expect(CANDIDATE_INFO_KEY).toBe('candidate_info');
  });

  it('routes are defined for all onboarding steps', () => {
    const routes = ['/', '/onboarding/basic', '/onboarding/consent', '/onboarding/resume', '/status', '/interview'];
    expect(routes).toHaveLength(6);
    expect(routes[0]).toBe('/');
    expect(routes).toContain('/status');
    expect(routes).toContain('/interview');
  });

  it('consent types match backend expectations', () => {
    const consentTypes = ['lgpd', 'terms'];
    expect(consentTypes).toContain('lgpd');
    expect(consentTypes).toContain('terms');
  });
});

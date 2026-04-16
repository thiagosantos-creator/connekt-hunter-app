import { describe, expect, it } from 'vitest';
import { derivePreferenceDraft, resolveNextOnboardingStep } from './onboarding-flow.js';

describe('onboarding-flow', () => {
  it('routes token entry to the next incomplete onboarding step', () => {
    expect(resolveNextOnboardingStep({
      basicCompleted: true,
      consentCompleted: true,
      resumeCompleted: true,
      preferencesCompleted: false,
      introVideoCompleted: false,
      status: 'pending',
    })).toBe('/onboarding/preferences');

    expect(resolveNextOnboardingStep({
      basicCompleted: true,
      consentCompleted: true,
      resumeCompleted: true,
      preferencesCompleted: true,
      introVideoCompleted: false,
      status: 'pending',
    })).toBe('/onboarding/intro-video');
  });

  it('prefills preferences from parsed resume when candidate has no saved preferences', () => {
    const draft = derivePreferenceDraft({
      status: 'parsed',
      parsedData: {
        experience: [
          { role: 'Backend Engineer' },
          { role: 'Tech Lead' },
          { role: 'Backend Engineer' },
        ],
        languages: ['Português', { name: 'Inglês', level: 'Avançado' }],
      },
    }, null);

    expect(draft.jobTitles).toEqual(['Backend Engineer', 'Tech Lead']);
    expect(draft.languages).toEqual(['Português', 'Inglês']);
  });
});

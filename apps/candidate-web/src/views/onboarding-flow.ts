import type { CandidateInfo, CandidateStatus, ParsedResumeData } from '../services/types.js';

export function resolveNextOnboardingStep(
  onboarding?: CandidateInfo['onboarding'] | CandidateStatus['steps'][number][],
): string {
  if (!onboarding) return '/onboarding/basic';

  if (Array.isArray(onboarding)) {
    const basic = onboarding.find((step) => step.key === 'basic');
    const consent = onboarding.find((step) => step.key === 'consent');
    const resume = onboarding.find((step) => step.key === 'resume');
    const preferences = onboarding.find((step) => step.key === 'preferences');
    const introVideo = onboarding.find((step) => step.key === 'intro-video');

    if (!basic?.completed) return '/onboarding/basic';
    if (!consent?.completed) return '/onboarding/consent';
    if (!resume?.completed) return '/onboarding/resume';
    if (!preferences?.completed) return '/onboarding/preferences';
    if (!introVideo?.completed) return '/onboarding/intro-video';
    return '/status';
  }

  if (onboarding.status === 'completed') return '/status';
  if (!onboarding.basicCompleted) return '/onboarding/basic';
  if (!onboarding.consentCompleted) return '/onboarding/consent';
  if (!onboarding.resumeCompleted) return '/onboarding/resume';
  if (!('preferencesCompleted' in onboarding) || !onboarding.preferencesCompleted) return '/onboarding/preferences';
  if (!('introVideoCompleted' in onboarding) || !onboarding.introVideoCompleted) return '/onboarding/intro-video';
  return '/status';
}

export function derivePreferenceDraft(
  parsedResume: ParsedResumeData | null,
  existingPreferences: CandidateStatus['preferences'] | null,
) {
  if (existingPreferences) {
    return {
      salaryMin: existingPreferences.salaryMin?.toString() ?? '',
      salaryMax: existingPreferences.salaryMax?.toString() ?? '',
      jobTitles: existingPreferences.jobTitles.slice(0, 3),
      languages: existingPreferences.languages,
      workModelPreference: existingPreferences.workModelPreference,
    };
  }

  const parsed = parsedResume?.parsedData;
  const jobTitles = Array.from(
    new Set(
      (parsed?.experience ?? [])
        .map((item) => item.role?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, 3);

  const languages = Array.from(
    new Set(
      (parsed?.languages ?? [])
        .map((item) => (typeof item === 'string' ? item : item.name)?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return {
    salaryMin: '',
    salaryMax: '',
    jobTitles,
    languages,
    workModelPreference: [],
  };
}

export const backofficeNavigation = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/vacancies', label: 'Vacancies' },
  { href: '/candidates', label: 'Candidates' },
  { href: '/applications', label: 'Applications' },
  { href: '/shortlists', label: 'Shortlists' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/communications', label: 'Communications' },
  { href: '/audit', label: 'Audit' },
  { href: '/settings/integrations', label: 'Integrations' },
] as const;

export const candidateJourneySteps = [
  'token-entry',
  'public-vacancy',
  'onboarding',
  'terms-consent',
  'resume-upload',
  'resume-review',
  'video-presentation',
  'smart-interview',
  'application-status',
  'social-login',
  'optional-account',
] as const;

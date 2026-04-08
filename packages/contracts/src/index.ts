export const platformProfiles = [
  'administrator',
  'headhunter',
  'client-user',
  'candidate',
] as const;

export type PlatformProfile = (typeof platformProfiles)[number];

export const backendModuleKeys = [
  'auth-iam',
  'rbac-tenancy',
  'organizations-memberships',
  'vacancy-management',
  'vacancy-publishing',
  'candidate-crm',
  'candidate-onboarding',
  'application-management',
  'resume-processing',
  'interview-media',
  'smart-interview',
  'shortlist-evaluation',
  'client-review',
  'communications',
  'workflow-notifications',
  'audit-admin',
  'ai-orchestration',
  'integrations-hub',
] as const;

export type BackendModuleKey = (typeof backendModuleKeys)[number];

export interface PlaceholderHealthSummary {
  module: BackendModuleKey;
  status: 'scaffolded';
  specPath: string;
}

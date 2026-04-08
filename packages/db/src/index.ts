import path from 'node:path';

export const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
export const migrationDirectory = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
);

export const dbEntities = [
  'users',
  'organizations',
  'memberships',
  'roles',
  'permissions',
  'vacancies',
  'vacancyPublications',
  'candidates',
  'candidateProfiles',
  'applications',
  'candidateOnboardingSessions',
  'candidateConsents',
  'candidateResumes',
  'resumeParseResults',
  'videoAssets',
  'smartInterviewSessions',
  'smartInterviewQuestions',
  'smartInterviewAnswers',
  'transcripts',
  'shortlists',
  'shortlistItems',
  'evaluations',
  'clientDecisions',
  'messageTemplates',
  'messageDispatches',
  'messageEvents',
  'auditEvents',
  'integrationConnections',
  'outboxEvents',
] as const;

-- Initial migration for Vertical Slice 01
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Organization" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Membership" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  UNIQUE("organizationId","userId")
);

CREATE TABLE "Vacancy" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Candidate" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "token" TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CandidateProfile" (
  "id" TEXT PRIMARY KEY,
  "candidateId" TEXT UNIQUE NOT NULL,
  "fullName" TEXT,
  "phone" TEXT
);

CREATE TABLE "Application" (
  "id" TEXT PRIMARY KEY,
  "candidateId" TEXT NOT NULL,
  "vacancyId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("candidateId","vacancyId")
);

CREATE TABLE "CandidateOnboardingSession" (
  "id" TEXT PRIMARY KEY,
  "candidateId" TEXT UNIQUE NOT NULL,
  "basicCompleted" BOOLEAN NOT NULL DEFAULT false,
  "consentCompleted" BOOLEAN NOT NULL DEFAULT false,
  "resumeCompleted" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE "CandidateConsent" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "accepted" BOOLEAN NOT NULL,
  "acceptedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CandidateResume" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'uploaded',
  "uploadedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ResumeParseResult" (
  "id" TEXT PRIMARY KEY,
  "resumeId" TEXT UNIQUE NOT NULL,
  "status" TEXT NOT NULL,
  "parsedJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Shortlist" (
  "id" TEXT PRIMARY KEY,
  "vacancyId" TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ShortlistItem" (
  "id" TEXT PRIMARY KEY,
  "shortlistId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("shortlistId","applicationId")
);

CREATE TABLE "Evaluation" (
  "id" TEXT PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "evaluatorId" TEXT NOT NULL,
  "comment" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ClientDecision" (
  "id" TEXT PRIMARY KEY,
  "shortlistItemId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditEvent" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MessageDispatch" (
  "id" TEXT PRIMARY KEY,
  "channel" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OutboxEvent" (
  "id" TEXT PRIMARY KEY,
  "topic" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

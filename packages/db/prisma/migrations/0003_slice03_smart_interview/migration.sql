CREATE TABLE IF NOT EXISTS "SmartInterviewTemplate" (
  "id" TEXT PRIMARY KEY,
  "vacancyId" TEXT UNIQUE NOT NULL,
  "configJson" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SmartInterviewQuestion" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "prompt" TEXT NOT NULL,
  "maxDuration" INTEGER NOT NULL DEFAULT 120,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("templateId", "orderIndex")
);

CREATE TABLE IF NOT EXISTS "SmartInterviewSession" (
  "id" TEXT PRIMARY KEY,
  "applicationId" TEXT UNIQUE NOT NULL,
  "templateId" TEXT NOT NULL,
  "publicToken" TEXT UNIQUE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "startedAt" TIMESTAMP,
  "submittedAt" TIMESTAMP,
  "reviewedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SmartInterviewAnswer" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "durationSec" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'uploaded',
  "uploadedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP,
  UNIQUE("sessionId", "questionId")
);

CREATE TABLE IF NOT EXISTS "SmartInterviewTranscript" (
  "id" TEXT PRIMARY KEY,
  "answerId" TEXT UNIQUE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "content" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'pt-BR',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SmartInterviewAiAnalysis" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT UNIQUE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "summary" TEXT NOT NULL,
  "highlights" JSONB NOT NULL,
  "risks" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SmartInterviewHumanReview" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT UNIQUE NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "SmartInterviewTemplate" ADD CONSTRAINT "SmartInterviewTemplate_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SmartInterviewQuestion" ADD CONSTRAINT "SmartInterviewQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SmartInterviewTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SmartInterviewSession" ADD CONSTRAINT "SmartInterviewSession_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SmartInterviewSession" ADD CONSTRAINT "SmartInterviewSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SmartInterviewTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SmartInterviewAnswer" ADD CONSTRAINT "SmartInterviewAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SmartInterviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SmartInterviewAnswer" ADD CONSTRAINT "SmartInterviewAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SmartInterviewQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SmartInterviewAnswer" ADD CONSTRAINT "SmartInterviewAnswer_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SmartInterviewTranscript" ADD CONSTRAINT "SmartInterviewTranscript_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "SmartInterviewAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SmartInterviewAiAnalysis" ADD CONSTRAINT "SmartInterviewAiAnalysis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SmartInterviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SmartInterviewHumanReview" ADD CONSTRAINT "SmartInterviewHumanReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SmartInterviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SmartInterviewHumanReview" ADD CONSTRAINT "SmartInterviewHumanReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

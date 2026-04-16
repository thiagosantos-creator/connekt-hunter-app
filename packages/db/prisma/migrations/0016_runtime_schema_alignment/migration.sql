ALTER TABLE "CandidateOnboardingSession"
  ADD COLUMN IF NOT EXISTS "preferencesCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "introVideoCompleted" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CandidateProfile"
  ADD COLUMN IF NOT EXISTS "introVideoKey" TEXT,
  ADD COLUMN IF NOT EXISTS "introVideoProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "introVideoDurationSec" INTEGER,
  ADD COLUMN IF NOT EXISTS "introVideoUploadedAt" TIMESTAMP(3);

ALTER TABLE "CommunicationDispatchAudit"
  ADD COLUMN IF NOT EXISTS "renderedContent" TEXT;

ALTER TABLE "RiskEvaluation"
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewAction" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewReason" TEXT;

ALTER TABLE "RiskSignal"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';

ALTER TABLE "TenantSettings"
  ADD COLUMN IF NOT EXISTS "defaultFeedbackMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "riskPenaltyWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS "recommendationBoostWeight" DOUBLE PRECISION NOT NULL DEFAULT 3;

ALTER TABLE "Vacancy"
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "filledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "guaranteeEndDate" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "CandidatePreferences" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "salaryMin" INTEGER,
  "salaryMax" INTEGER,
  "jobTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CandidatePreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CandidatePreferences_candidateId_key"
  ON "CandidatePreferences"("candidateId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CandidatePreferences_candidateId_fkey'
  ) THEN
    ALTER TABLE "CandidatePreferences"
      ADD CONSTRAINT "CandidatePreferences_candidateId_fkey"
      FOREIGN KEY ("candidateId")
      REFERENCES "Candidate"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Vacancy"
  ADD COLUMN "sector" TEXT,
  ADD COLUMN "experienceYearsMin" INTEGER,
  ADD COLUMN "experienceYearsMax" INTEGER,
  ADD COLUMN "publishedAt" TIMESTAMP(3);

ALTER TABLE "UserNotificationPreference"
  ADD COLUMN "phoneEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "eventAccessChange" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "eventCriticalAudit" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "CandidateInvite" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "vacancyId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "dispatchId" TEXT,
  "invitedByUserId" TEXT NOT NULL,
  "failureReason" TEXT,
  "metadata" JSONB,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CandidateInvite_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CandidateInvite_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CandidateInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CandidateInvite_org_created_idx" ON "CandidateInvite"("organizationId", "createdAt");
CREATE INDEX "CandidateInvite_vacancy_status_idx" ON "CandidateInvite"("vacancyId", "status");
CREATE INDEX "CandidateInvite_candidate_created_idx" ON "CandidateInvite"("candidateId", "createdAt");

CREATE TABLE "NotificationDispatch" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "frequency" TEXT NOT NULL DEFAULT 'immediate',
  "failureReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationDispatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "NotificationDispatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "NotificationDispatch_user_created_idx" ON "NotificationDispatch"("userId", "createdAt");
CREATE INDEX "NotificationDispatch_org_event_created_idx" ON "NotificationDispatch"("organizationId", "eventKey", "createdAt");

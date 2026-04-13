ALTER TABLE "Organization"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "ownerAdminUserId" TEXT;

ALTER TABLE "Vacancy"
  ADD COLUMN "location" TEXT,
  ADD COLUMN "workModel" TEXT,
  ADD COLUMN "seniority" TEXT,
  ADD COLUMN "employmentType" TEXT,
  ADD COLUMN "publicationType" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "department" TEXT,
  ADD COLUMN "requiredSkills" JSONB,
  ADD COLUMN "desiredSkills" JSONB,
  ADD COLUMN "salaryMin" INTEGER,
  ADD COLUMN "salaryMax" INTEGER;

ALTER TABLE "Candidate"
  ADD COLUMN "phone" TEXT;

CREATE UNIQUE INDEX "Candidate_phone_key" ON "Candidate"("phone");

CREATE TABLE "TenantPolicy" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "canInviteCandidates" BOOLEAN NOT NULL DEFAULT true,
  "canApproveDecisions" BOOLEAN NOT NULL DEFAULT true,
  "canAuditEvents" BOOLEAN NOT NULL DEFAULT true,
  "canAdministrateTenant" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantPolicy_organizationId_key" ON "TenantPolicy"("organizationId");

ALTER TABLE "TenantPolicy" ADD CONSTRAINT "TenantPolicy_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "UserNotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "eventNewInvite" BOOLEAN NOT NULL DEFAULT true,
  "eventStepCompleted" BOOLEAN NOT NULL DEFAULT true,
  "eventDecision" BOOLEAN NOT NULL DEFAULT true,
  "eventReminder" BOOLEAN NOT NULL DEFAULT true,
  "frequency" TEXT NOT NULL DEFAULT 'immediate',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserNotificationPreference_userId_key" ON "UserNotificationPreference"("userId");

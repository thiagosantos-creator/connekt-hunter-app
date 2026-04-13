-- Phase 3 enterprise governance foundation
CREATE TABLE "TenantSettings" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL UNIQUE,
  "planSegment" TEXT NOT NULL,
  "slaResponseHours" INTEGER NOT NULL DEFAULT 24,
  "slaClosureHours" INTEGER NOT NULL DEFAULT 336,
  "timezone" TEXT NOT NULL,
  "operationalCalendar" TEXT NOT NULL,
  "tenantStatus" TEXT NOT NULL DEFAULT 'trial',
  "logoUrl" TEXT,
  "bannerUrl" TEXT,
  "primaryColor" TEXT,
  "secondaryColor" TEXT,
  "publicName" TEXT,
  "communicationDomain" TEXT,
  "dataRetentionDays" INTEGER NOT NULL DEFAULT 365,
  "auditRetentionDays" INTEGER NOT NULL DEFAULT 365,
  "mfaRequiredRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "maxSessionMinutes" INTEGER NOT NULL DEFAULT 480,
  "communicationWindowStart" TEXT NOT NULL DEFAULT '08:00',
  "communicationWindowEnd" TEXT NOT NULL DEFAULT '20:00',
  "frequencyLimitPerDay" INTEGER NOT NULL DEFAULT 5,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "TenantPolicyVersion" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tenantSettingsId" TEXT,
  "version" INTEGER NOT NULL,
  "policyJson" JSONB NOT NULL,
  "previousPolicyJson" JSONB,
  "changedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantPolicyVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TenantPolicyVersion_tenantSettingsId_fkey" FOREIGN KEY ("tenantSettingsId") REFERENCES "TenantSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TenantPolicyVersion_organizationId_version_key" ON "TenantPolicyVersion"("organizationId", "version");

CREATE TABLE "RolePolicy" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "roleKey" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "allowed" BOOLEAN NOT NULL DEFAULT true,
  "updatedBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RolePolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RolePolicy_org_role_resource_action_scope_key" ON "RolePolicy"("organizationId", "roleKey", "resource", "action", "scope");

CREATE TABLE "PermissionGrant" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "grantedBy" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PermissionGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PermissionGrant_org_user_expires_idx" ON "PermissionGrant"("organizationId", "userId", "expiresAt");

CREATE TABLE "CommunicationTemplate" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "placeholders" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "CommunicationTemplateVersion" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommunicationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationTemplateVersion_templateId_version_key" ON "CommunicationTemplateVersion"("templateId", "version");

CREATE TABLE "CommunicationDispatchAudit" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "templateVersionId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "failureReason" TEXT,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "requestedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationDispatchAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommunicationDispatchAudit_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommunicationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommunicationDispatchAudit_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "CommunicationTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "TenantKpiSnapshot" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "invites" INTEGER NOT NULL DEFAULT 0,
  "responses" INTEGER NOT NULL DEFAULT 0,
  "shortlisted" INTEGER NOT NULL DEFAULT 0,
  "approved" INTEGER NOT NULL DEFAULT 0,
  "onboarded" INTEGER NOT NULL DEFAULT 0,
  "avgTimeToPublishHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avgInviteToOnboardingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avgDecisionTimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "throughputPerHeadhunter" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "slaMet" INTEGER NOT NULL DEFAULT 0,
  "slaBreached" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  CONSTRAINT "TenantKpiSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "TenantKpiSnapshot_org_period_captured_idx" ON "TenantKpiSnapshot"("organizationId", "period", "capturedAt");

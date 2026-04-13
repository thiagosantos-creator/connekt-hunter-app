-- Slice 12: conversion & efficiency (templates, AI assist logs, follow-up cadence)

CREATE TABLE IF NOT EXISTS "VacancyTemplate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sector" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "defaultFields" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "vacancyId" TEXT,
  CONSTRAINT "VacancyTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VacancyTemplateVersion" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "fields" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VacancyTemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InviteFollowUpCadence" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "vacancyId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "applicationId" TEXT,
  "channelPlan" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "pausedUntil" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InviteFollowUpCadence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InviteFollowUpAttempt" (
  "id" TEXT NOT NULL,
  "cadenceId" TEXT NOT NULL,
  "stepKey" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InviteFollowUpAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VacancyTemplate_organizationId_status_idx" ON "VacancyTemplate"("organizationId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "VacancyTemplateVersion_templateId_version_key" ON "VacancyTemplateVersion"("templateId", "version");
CREATE INDEX IF NOT EXISTS "InviteFollowUpCadence_organizationId_status_idx" ON "InviteFollowUpCadence"("organizationId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "InviteFollowUpCadence_candidateId_vacancyId_key" ON "InviteFollowUpCadence"("candidateId", "vacancyId");
CREATE INDEX IF NOT EXISTS "InviteFollowUpAttempt_status_scheduledAt_idx" ON "InviteFollowUpAttempt"("status", "scheduledAt");
CREATE UNIQUE INDEX IF NOT EXISTS "InviteFollowUpAttempt_cadenceId_stepKey_key" ON "InviteFollowUpAttempt"("cadenceId", "stepKey");

DO $$ BEGIN
  ALTER TABLE "VacancyTemplate" ADD CONSTRAINT "VacancyTemplate_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "VacancyTemplateVersion" ADD CONSTRAINT "VacancyTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "VacancyTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "InviteFollowUpAttempt" ADD CONSTRAINT "InviteFollowUpAttempt_cadenceId_fkey" FOREIGN KEY ("cadenceId") REFERENCES "InviteFollowUpCadence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

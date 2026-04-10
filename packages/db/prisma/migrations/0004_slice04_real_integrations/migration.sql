-- CreateTable
CREATE TABLE "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "integration" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'inactive',
  "configJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationConnection_integration_environment_key" ON "IntegrationConnection"("integration", "environment");

CREATE TABLE "ProviderExecutionLog" (
  "id" TEXT NOT NULL,
  "integration" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "requestJson" JSONB NOT NULL,
  "responseJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderExecutionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiExecutionLog" (
  "id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requestJson" JSONB NOT NULL,
  "responseJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiExecutionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialIdentityLink" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "profileJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialIdentityLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialIdentityLink_provider_subject_key" ON "SocialIdentityLink"("provider", "subject");

CREATE TABLE "WebhookDelivery" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TranscriptMetadata" (
  "id" TEXT NOT NULL,
  "answerId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "retries" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TranscriptMetadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TranscriptMetadata_answerId_key" ON "TranscriptMetadata"("answerId");

CREATE TABLE "ResumeParseMetadata" (
  "id" TEXT NOT NULL,
  "resumeId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "confidenceJson" JSONB NOT NULL,
  "mergedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResumeParseMetadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResumeParseMetadata_resumeId_key" ON "ResumeParseMetadata"("resumeId");

CREATE TABLE "MessageEvent" (
  "id" TEXT NOT NULL,
  "dispatchId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerMessageId" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessageEvent_provider_providerMessageId_idx" ON "MessageEvent"("provider", "providerMessageId");

CREATE TABLE "StorageAssetMetadata" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorageAssetMetadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorageAssetMetadata_objectKey_key" ON "StorageAssetMetadata"("objectKey");

ALTER TABLE "TranscriptMetadata" ADD CONSTRAINT "TranscriptMetadata_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "SmartInterviewAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResumeParseMetadata" ADD CONSTRAINT "ResumeParseMetadata_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "CandidateResume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageEvent" ADD CONSTRAINT "MessageEvent_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "MessageDispatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Make ClientDecision.reviewerId nullable (to support public/tokenized reviews)
ALTER TABLE "ClientDecision"
  ALTER COLUMN "reviewerId" DROP NOT NULL;

-- Create ClientReviewSession table
CREATE TABLE "ClientReviewSession" (
  "id"             TEXT         NOT NULL,
  "token"          TEXT         NOT NULL,
  "vacancyId"      TEXT         NOT NULL,
  "organizationId" TEXT         NOT NULL,
  "createdByUserId" TEXT        NOT NULL,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "accessedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientReviewSession_pkey" PRIMARY KEY ("id")
);

-- Unique and index constraints
CREATE UNIQUE INDEX "ClientReviewSession_token_key" ON "ClientReviewSession"("token");
CREATE INDEX "ClientReviewSession_token_idx" ON "ClientReviewSession"("token");
CREATE INDEX "ClientReviewSession_vacancyId_idx" ON "ClientReviewSession"("vacancyId");

-- Foreign key to Vacancy
ALTER TABLE "ClientReviewSession"
  ADD CONSTRAINT "ClientReviewSession_vacancyId_fkey"
  FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

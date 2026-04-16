ALTER TABLE "CandidateProfile"
ADD COLUMN "locationCity" TEXT,
ADD COLUMN "locationState" TEXT,
ADD COLUMN "locationCountry" TEXT,
ADD COLUMN "resumeSummary" TEXT;

CREATE TABLE "CandidateExperience" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "period" TEXT,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'cv-parse',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateExperience_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateEducation" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "field" TEXT,
    "period" TEXT,
    "source" TEXT NOT NULL DEFAULT 'cv-parse',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateEducation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateSkill" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "source" TEXT NOT NULL DEFAULT 'cv-parse',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateLanguage" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "source" TEXT NOT NULL DEFAULT 'cv-parse',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateLanguage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CandidateExperience_profileId_idx" ON "CandidateExperience"("profileId");
CREATE INDEX "CandidateEducation_profileId_idx" ON "CandidateEducation"("profileId");
CREATE INDEX "CandidateSkill_profileId_idx" ON "CandidateSkill"("profileId");
CREATE UNIQUE INDEX "CandidateSkill_profileId_name_key" ON "CandidateSkill"("profileId", "name");
CREATE INDEX "CandidateLanguage_profileId_idx" ON "CandidateLanguage"("profileId");
CREATE UNIQUE INDEX "CandidateLanguage_profileId_name_key" ON "CandidateLanguage"("profileId", "name");

ALTER TABLE "CandidateExperience"
ADD CONSTRAINT "CandidateExperience_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateEducation"
ADD CONSTRAINT "CandidateEducation_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateSkill"
ADD CONSTRAINT "CandidateSkill_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateLanguage"
ADD CONSTRAINT "CandidateLanguage_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

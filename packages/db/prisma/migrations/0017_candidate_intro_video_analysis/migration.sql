ALTER TABLE "CandidateProfile"
ADD COLUMN "introVideoAnalysisStatus" TEXT,
ADD COLUMN "introVideoTranscript" TEXT,
ADD COLUMN "introVideoTranscriptLanguage" TEXT,
ADD COLUMN "introVideoSummary" TEXT,
ADD COLUMN "introVideoTags" JSONB,
ADD COLUMN "introVideoSentimentJson" JSONB,
ADD COLUMN "introVideoEntitiesJson" JSONB,
ADD COLUMN "introVideoKeyPhrasesJson" JSONB,
ADD COLUMN "introVideoAnalyzedAt" TIMESTAMP(3);

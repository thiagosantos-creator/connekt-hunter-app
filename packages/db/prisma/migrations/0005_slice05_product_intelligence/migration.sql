-- CreateTable
CREATE TABLE "CandidateEmbedding" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'resume+interview',
    "vector" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CandidateEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacancyEmbedding" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'vacancy-description',
    "vector" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VacancyEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchingScore" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchingScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchingBreakdown" (
    "id" TEXT NOT NULL,
    "matchingScoreId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchingBreakdown_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateInsight" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ai-assisted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CandidateInsight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateComparison" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "leftCandidateId" TEXT NOT NULL,
    "rightCandidateId" TEXT NOT NULL,
    "comparisonJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CandidateComparison_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateRankingSnapshot" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CandidateRankingSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiEvidence" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "matchingScoreId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiExplanation" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "matchingScoreId" TEXT,
    "context" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiExplanation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CandidateEmbedding_candidateId_source_key" ON "CandidateEmbedding"("candidateId", "source");
CREATE UNIQUE INDEX "VacancyEmbedding_vacancyId_source_key" ON "VacancyEmbedding"("vacancyId", "source");
CREATE UNIQUE INDEX "MatchingScore_candidateId_vacancyId_key" ON "MatchingScore"("candidateId", "vacancyId");
CREATE UNIQUE INDEX "MatchingBreakdown_matchingScoreId_dimension_key" ON "MatchingBreakdown"("matchingScoreId", "dimension");
CREATE UNIQUE INDEX "CandidateInsight_candidateId_vacancyId_key" ON "CandidateInsight"("candidateId", "vacancyId");
CREATE UNIQUE INDEX "CandidateComparison_vacancyId_leftCandidateId_rightCandidateId_key" ON "CandidateComparison"("vacancyId", "leftCandidateId", "rightCandidateId");
CREATE UNIQUE INDEX "CandidateRankingSnapshot_vacancyId_candidateId_key" ON "CandidateRankingSnapshot"("vacancyId", "candidateId");
CREATE UNIQUE INDEX "CandidateRankingSnapshot_vacancyId_rank_key" ON "CandidateRankingSnapshot"("vacancyId", "rank");

ALTER TABLE "CandidateEmbedding" ADD CONSTRAINT "CandidateEmbedding_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VacancyEmbedding" ADD CONSTRAINT "VacancyEmbedding_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchingScore" ADD CONSTRAINT "MatchingScore_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchingScore" ADD CONSTRAINT "MatchingScore_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchingBreakdown" ADD CONSTRAINT "MatchingBreakdown_matchingScoreId_fkey" FOREIGN KEY ("matchingScoreId") REFERENCES "MatchingScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateInsight" ADD CONSTRAINT "CandidateInsight_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateComparison" ADD CONSTRAINT "CandidateComparison_leftCandidateId_fkey" FOREIGN KEY ("leftCandidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateComparison" ADD CONSTRAINT "CandidateComparison_rightCandidateId_fkey" FOREIGN KEY ("rightCandidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateRankingSnapshot" ADD CONSTRAINT "CandidateRankingSnapshot_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateRankingSnapshot" ADD CONSTRAINT "CandidateRankingSnapshot_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiEvidence" ADD CONSTRAINT "AiEvidence_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiEvidence" ADD CONSTRAINT "AiEvidence_matchingScoreId_fkey" FOREIGN KEY ("matchingScoreId") REFERENCES "MatchingScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiExplanation" ADD CONSTRAINT "AiExplanation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiExplanation" ADD CONSTRAINT "AiExplanation_matchingScoreId_fkey" FOREIGN KEY ("matchingScoreId") REFERENCES "MatchingScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

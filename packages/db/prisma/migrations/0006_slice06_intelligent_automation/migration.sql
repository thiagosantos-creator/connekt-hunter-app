CREATE TABLE "CandidateRecommendation" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "actionableInsights" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'ai-assisted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CandidateRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidatePriorityScore" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "priorityBand" TEXT NOT NULL,
    "factors" JSONB NOT NULL,
    "rationale" TEXT NOT NULL,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CandidatePriorityScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowSuggestion" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "suggestionType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "requiresHumanApproval" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkflowSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationExecution" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "workflowSuggestionId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB NOT NULL,
    "triggeredBy" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskSignal" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskEvaluation" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "overallRisk" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "findings" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RiskEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CandidateRecommendation_vacancyId_status_idx" ON "CandidateRecommendation"("vacancyId", "status");
CREATE INDEX "CandidateRecommendation_candidateId_vacancyId_idx" ON "CandidateRecommendation"("candidateId", "vacancyId");
CREATE UNIQUE INDEX "CandidatePriorityScore_candidateId_vacancyId_key" ON "CandidatePriorityScore"("candidateId", "vacancyId");
CREATE INDEX "CandidatePriorityScore_vacancyId_score_idx" ON "CandidatePriorityScore"("vacancyId", "score");
CREATE INDEX "WorkflowSuggestion_vacancyId_status_idx" ON "WorkflowSuggestion"("vacancyId", "status");
CREATE INDEX "AutomationExecution_vacancyId_status_idx" ON "AutomationExecution"("vacancyId", "status");
CREATE INDEX "RiskSignal_vacancyId_severity_idx" ON "RiskSignal"("vacancyId", "severity");
CREATE UNIQUE INDEX "RiskEvaluation_candidateId_vacancyId_key" ON "RiskEvaluation"("candidateId", "vacancyId");

ALTER TABLE "CandidateRecommendation" ADD CONSTRAINT "CandidateRecommendation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateRecommendation" ADD CONSTRAINT "CandidateRecommendation_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidatePriorityScore" ADD CONSTRAINT "CandidatePriorityScore_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidatePriorityScore" ADD CONSTRAINT "CandidatePriorityScore_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowSuggestion" ADD CONSTRAINT "WorkflowSuggestion_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowSuggestion" ADD CONSTRAINT "WorkflowSuggestion_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_workflowSuggestionId_fkey" FOREIGN KEY ("workflowSuggestionId") REFERENCES "WorkflowSuggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskSignal" ADD CONSTRAINT "RiskSignal_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskSignal" ADD CONSTRAINT "RiskSignal_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskEvaluation" ADD CONSTRAINT "RiskEvaluation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskEvaluation" ADD CONSTRAINT "RiskEvaluation_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

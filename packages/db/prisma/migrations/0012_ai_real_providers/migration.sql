-- AlterTable: Add sentiment analysis and AI provider fields to SmartInterviewAiAnalysis
ALTER TABLE "SmartInterviewAiAnalysis" ADD COLUMN IF NOT EXISTS "evidence" JSONB;
ALTER TABLE "SmartInterviewAiAnalysis" ADD COLUMN IF NOT EXISTS "sentimentJson" JSONB;
ALTER TABLE "SmartInterviewAiAnalysis" ADD COLUMN IF NOT EXISTS "entitiesJson" JSONB;
ALTER TABLE "SmartInterviewAiAnalysis" ADD COLUMN IF NOT EXISTS "keyPhrasesJson" JSONB;
ALTER TABLE "SmartInterviewAiAnalysis" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'ai-mock';
ALTER TABLE "SmartInterviewAiAnalysis" ADD COLUMN IF NOT EXISTS "modelVersion" TEXT NOT NULL DEFAULT 'mock-v1';

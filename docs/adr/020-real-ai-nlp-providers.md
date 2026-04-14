# ADR 020 — Real AI/NLP Providers (AWS Transcribe + Comprehend + OpenAI)

## Status

Accepted

## Context

All AI, transcription, and NLP operations in Connekt Hunter were running as hardcoded mock implementations since Slice 04. The architecture (feature flags, provider abstraction, audit logging) was fully prepared for real providers, but no SDK integration or real API calls existed.

For production readiness, we need:
1. **Real audio transcription** — candidate interview videos → text via AWS Transcribe
2. **NLP analysis** — sentiment, key phrases, entity detection via AWS Comprehend
3. **LLM-powered operations** — structured prompts for interview analysis, CV parsing, insights, comparisons, recommendations, and risk analysis via OpenAI
4. **Zero breaking changes** — mock fallback must remain available for local development

## Decision

### Real Provider Implementation

1. **`AwsTranscribeProvider`** — Wraps `@aws-sdk/client-transcribe` with job start, polling, and transcript retrieval from S3 output.
2. **`AwsComprehendProvider`** — Wraps `@aws-sdk/client-comprehend` for parallel `DetectSentiment`, `DetectKeyPhrases`, and `DetectEntities` calls.
3. **`OpenAiProvider`** — Wraps `openai` SDK with structured `response_format: json_object` prompts for all 8 AI gateway operations plus CV resume parsing.

### Gateway Refactoring Pattern

All gateways use a `withFallback` pattern:
- When `FF_*_REAL=true` → calls real provider
- On real provider failure → logs error to `AiExecutionLog`, checks `*_FALLBACK_TO_MOCK` flag
- If fallback enabled → returns mock result transparently
- If fallback disabled → throws error

### Worker Pipeline Enhancement

- `processSmartInterviewVideoJobs`: Uses `TranscribeClient` directly (start job → poll → fetch transcript) when `FF_TRANSCRIPTION_REAL=true`
- `processSmartInterviewAnalysisJobs`: Uses `ComprehendClient` for sentiment/entities/key-phrases when `FF_AI_REAL=true`
- Both have automatic mock fallback configurable via env vars

### Schema Enrichment

`SmartInterviewAiAnalysis` gains 6 new nullable/defaulted columns:
- `evidence Json?` — concrete evidence cited by AI
- `sentimentJson Json?` — sentiment analysis (overall + scores)
- `entitiesJson Json?` — detected entities with types and scores
- `keyPhrasesJson Json?` — key phrases with confidence
- `provider String @default("ai-mock")` — which provider generated the analysis
- `modelVersion String @default("mock-v1")` — model version used

## Consequences

### Positive
- Production-ready AI pipeline with full audit trail
- All Portuguese-first prompts with temperature-tuned operations
- Local development unchanged (`FF_*_REAL=false` by default)
- Every AI response traced with provider + model + prompt version

### Negative
- AWS SDK adds ~120 packages to dependency tree
- Real provider calls add latency (Transcribe polling up to 5 min)
- OpenAI costs per API call (mitigated by configurable model version)

### Risks
- AWS Transcribe may timeout for very long recordings (mitigated by 60-attempt polling)
- OpenAI rate limits may affect batch processing (mitigated by worker batching)

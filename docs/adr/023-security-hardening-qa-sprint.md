# ADR-023 — Security Hardening: CORS, Helmet, Exception Filter, Graceful Shutdown

## Status
**Accepted** — Implemented in QA Sprint 1+2+3

## Context
A comprehensive QA audit identified 67 technical debt items and gaps, including 6 critical (P0) security issues:

1. CORS configured with `origin: true` + `credentials: true` allowing any domain
2. Cognito client secret exposed in controller-level code flow
3. No security headers (missing helmet middleware)
4. `/auth/dev-login` endpoint accessible in production
5. No global exception filter — stack traces could leak
6. Worker process running fire-and-forget with no error handlers

Additional P1/P2 reliability gaps:
- Memory leaks in rate limiter and token cache fallback stores
- No retry/timeout in candidate-web API client
- No 429 (rate limit) handling in frontend clients
- No file size validation in presigned uploads
- N+1 query in candidate ranking service
- Missing database indexes and cascading deletes
- No OpenAI timeout configuration

## Decision

### Security (P0)
1. **CORS whitelist**: Restrict origins via `CORS_ORIGINS` env var (comma-separated). Falls back to `localhost:5173,5174` in dev.
2. **Cognito secret encapsulation**: `CognitoCallbackService.getClientSecret()` reads the secret internally; controller never passes it.
3. **Helmet middleware**: Added `helmet()` for security headers (X-Frame-Options, X-Content-Type-Options, CSP, HSTS).
4. **Dev-login guard**: Returns `ForbiddenException` unless `APP_ENV` is `local`, `development`, or `test`.
5. **Global exception filter**: `GlobalExceptionFilter` catches all exceptions; HttpExceptions pass through, unexpected errors return generic `500 Internal server error` with full server-side logging.
6. **Graceful shutdown**: `app.enableShutdownHooks()` on API. Worker has `process.on('unhandledRejection')` + `process.on('uncaughtException')` + `run().catch()`.

### Reliability (P1–P2)
7. **Memory leak fixes**: Both `RateLimitGuard.fallbackStore` and `PublicTokenCacheService.localFallback` Maps now have periodic cleanup via `setInterval(..., 60_000).unref()`.
8. **Candidate-web API resilience**: Added `fetchWithRetry()` with exponential backoff (3 retries), 30s `AbortController` timeout, 429 retry-after handling. Matches backoffice-web pattern.
9. **429 handling**: Both frontend API clients detect rate-limit responses and either retry or show user-friendly message.
10. **Upload validation**: `StorageGateway.createPresignedUpload()` enforces 50MB max size and extension allowlist.
11. **N+1 fix**: `CandidateRankingService.generate()` replaced sequential `create()` loop with `createMany()`.
12. **Database indexes**: Added indexes on `Candidate(organizationId)`, `AuditEvent(actorId, createdAt)`, `AuditEvent(entityType, entityId)`, `OutboxEvent(topic, processed, createdAt)`, `Application(vacancyId, status)`.
13. **Cascading deletes**: All child relations in Prisma schema now have explicit `onDelete` policies:
    - `Cascade` for dependent children (applications, evaluations, shortlist items, etc.)
    - `Restrict` for critical refs (evaluator, reviewer, vacancy creator)
    - `SetNull` for optional refs (matchingScore, workflowSuggestion, tenantSettings)
14. **OpenAI timeout**: OpenAI client configured with `timeout: 30s` and `maxRetries: 1` (via `OPENAI_TIMEOUT_MS` env var).
15. **Info disclosure fix**: `getCandidateAuthConfig()` no longer exposes `clientSecretConfigured` / `usesClientSecret` booleans.

## Consequences

### Positive
- Eliminates all P0 (critical) security vulnerabilities
- Prevents memory leaks under Redis unavailability
- Candidate experience improved with retry/timeout resilience
- Database integrity enforced with proper cascade policies
- External API calls (OpenAI) cannot hang indefinitely

### Negative
- `CORS_ORIGINS` must be configured per environment (breaking change if not set — falls back to localhost)
- Cascade deletes may cause surprise data loss if not understood — documented in schema comments
- Existing code that relied on `clientSecretConfigured` response field will get `undefined`

### Risks
- Cascade delete policies should be verified against business requirements before production migration
- Frontend clients storing tokens in localStorage remains a P1 debt (planned for future httpOnly cookie migration)

## Related
- ADR-015: Defensive Security Tenant Isolation
- ADR-016: Distributed Rate Limiting
- ADR-017: Token Cache Strategy
- SDD-06: Security Architecture

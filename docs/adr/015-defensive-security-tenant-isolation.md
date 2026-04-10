# ADR-015 — Defensive Security & Tenant Isolation (Slice 08)

## Status
Accepted

## Context
Slices 01–07 built the functional foundation but left security gaps:
- Intelligence services (matching, insights, recommendation, decision, risk) lacked service-level tenant isolation.
- Public candidate endpoints had no rate limiting or token expiration validation.
- Worker processed events without verifying tenant consistency.
- Missing unit tests for intelligence and onboarding modules.
- No automated audit trail verification.

## Decision

### Tenant Isolation
- Add `assertTenantAccess()` pattern to all intelligence services.
- Validate `candidate.organizationId === vacancy.organizationId` before processing.
- Worker uses `assertWorkerTenantConsistency()` for cross-tenant prevention.

### Public Endpoint Hardening
- `RateLimitGuard`: in-memory sliding window, 30 req/min per IP.
- `PublicTokenGuard`: validates token format, existence, and expiration via GuestSession.
- Structured logging for invalid/expired token attempts.

### Frontend Token Handling
- API client intercepts 401 `token_expired` responses and clears localStorage.
- `RequiresToken` component validates token against API on mount.

### Audit Verification
- Source-code scanning tests verify `auditEvent.create()` presence in critical endpoints.
- Tenant isolation patterns verified by automated tests.

## Consequences
- All intelligence operations are tenant-safe.
- Public endpoints resist basic abuse (rate limiting, token validation).
- Worker cannot process cross-tenant events.
- Audit trail coverage is verified automatically on every test run.

## Risks
- Rate limiting is in-memory (not distributed) — sufficient for single-instance but needs Redis for multi-instance.
- Token validation adds a DB query per public endpoint request.

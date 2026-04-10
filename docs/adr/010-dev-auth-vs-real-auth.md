# ADR 010: Dev auth vs real auth

## Status
Accepted

## Context
Local development needs fast bootstrap; staging requires realistic auth path.

## Decision
Keep `POST /auth/dev-login` and add `/auth/login` with feature-flagged real provider path (`AUTH_REAL_PROVIDER=true`).

## Consequences
- Backward compatibility for Slice 01.
- Dual-path auth code must be maintained.

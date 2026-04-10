# ADR 008: Auth strategy for Slice 02

## Status
Accepted

## Context
Slice 01 used only dev token (`dev-{userId}`), insufficient for staging.

## Decision
Adopt auth provider abstraction with session-based tokens (`sess-*`) persisted in DB, keeping dev auth as fallback.

## Consequences
- Enables IAM adapter in staging without breaking local flow.
- Requires session lifecycle endpoints (`login/logout/session/me`).

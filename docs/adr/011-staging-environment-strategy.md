# ADR 011: Staging environment strategy

## Status
Accepted

## Context
Need environment separation without destabilizing local docker-compose.

## Decision
Use env-based separation (`local` vs `staging`) with safe placeholders for real providers and toggle by feature flags/env vars.

## Consequences
- Predictable rollout in staging.
- More env configuration surface to document.

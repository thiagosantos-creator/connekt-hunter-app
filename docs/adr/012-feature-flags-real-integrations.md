# ADR 012: Feature flags for real integrations

## Status
Accepted

## Context
External integrations (IAM, social login, MFA) should be progressively activated.

## Decision
Persist feature flags in DB (`FeatureFlag` model) and gate provider adapters at runtime.

## Consequences
- Controlled activation per environment.
- Requires operational governance for flag states.

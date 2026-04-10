# ADR 009: Provider abstraction

## Status
Accepted

## Context
Integrations (auth/social/MFA) must not couple core domain to specific vendor.

## Decision
Introduce provider interfaces and adapters behind integration hub; default adapters are local mocks/placeholders.

## Consequences
- Easier vendor swap and testability.
- Additional translation layer required.

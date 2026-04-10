# Module Spec — Candidate Onboarding (Slice 04)

- Etapa resume agora registra asset metadata e parse metadata.
- Fluxo local preservado com providers mock.
- Eventos continuam publicados no outbox.

## Endpoint Hardening (Slice 08)
- Endpoints `/candidate/onboarding/*` agora protegidos com `RateLimitGuard` (30 req/min por IP).
- Token de candidato validado via `NotFoundException` caso não exista no banco.
- Cada etapa (basic, consent, resume) registra `auditEvent` com `candidateId` e `organizationId`.
- Testes unitários adicionados para validar token inválido e audit trail.

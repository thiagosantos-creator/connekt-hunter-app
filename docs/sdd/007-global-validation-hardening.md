# SDD-007 — Validação Global, Gap Analysis e Hardening

## Objetivo
Consolidar critérios de validação transversal dos Slices 01–06 e orientar correções de estabilidade sem expansão de escopo funcional.

## Escopo
- Validação de coerência entre specs (`docs/sdd/*`, `docs/sdd/modules/*`, `docs/sdd/integrations/*`) e implementação.
- Hardening de fluxos críticos: recrutamento, smart interview, inteligência, automação assistida e integrações com fallback.
- Reforço de consistência em RBAC, tenancy, estados de workflow e observabilidade.

## Regras de hardening
1. Estados devem ser validados explicitamente em transições críticas (ex.: `in_progress -> submitted -> reviewed`).
2. Toda operação sensível a tenant deve validar vínculo de organização e membership do ator.
3. Integrações devem manter fallback local configurável por feature flag.
4. Logs críticos devem ser estruturados para rastreabilidade operacional.
5. IA permanece em modo assistivo: explicável, auditável e com decisão final humana.

## Critérios de aceitação
- Fluxos principais executáveis ponta a ponta sem inconsistências de estado.
- Integrações reais operando com fallback seguro para mock/local.
- RBAC e tenancy protegendo endpoints sensíveis.
- Testes de regressão críticos cobrindo guardrails mínimos.
- Relatório de gaps publicado em `docs/reports/slice-07-gap-report.md`.

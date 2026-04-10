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
6. Todo endpoint CRUD sensível deve criar `auditEvent` com `actorId` e contexto de operação.
7. Worker deve isolar erros por evento individual para evitar bloqueio de pipeline.
8. Serviços devem usar `findUnique` + `NotFoundException` em vez de `findUniqueOrThrow` para respostas HTTP adequadas.

## Serviços endurecidos
| Serviço | Tenant Isolation | Audit Logging | State Validation | Error Handling |
|---------|-----------------|---------------|-----------------|----------------|
| SmartInterviewService | ✓ (vacancy.organizationId) | ✓ | ✓ (in_progress, submitted) | ✓ |
| WorkflowAutomationService | ✓ (cross-tenant + membership) | ✓ | ✓ (pending) | ✓ |
| ShortlistService | ✓ (membership) | ✓ | — | ✓ |
| EvaluationsService | ✓ (membership) | ✓ | — | ✓ |
| ClientDecisionsService | ✓ (membership) | ✓ (c/ actorId) | — | ✓ |
| OnboardingService | N/A (token-based) | ✓ | — | ✓ |
| ProviderRegistryService | N/A | N/A | — | ✓ (fail-fast) |
| Worker (main.ts) | ✓ (assertWorkerTenantConsistency) | ✓ | — | ✓ (per-event) |
| CandidateMatchingService | ✓ (cross-tenant + membership) | ✓ | — | ✓ |
| CandidateInsightsService | ✓ (cross-tenant + membership) | ✓ | — | ✓ |
| RecommendationEngineService | ✓ (cross-tenant + membership) | ✓ | — | ✓ |
| DecisionEngineService | ✓ (vacancy + membership) | ✓ | — | ✓ |
| RiskAnalysisService | ✓ (cross-tenant + membership) | ✓ | — | ✓ |

## Critérios de aceitação
- Fluxos principais executáveis ponta a ponta sem inconsistências de estado.
- Integrações reais operando com fallback seguro para mock/local.
- RBAC e tenancy protegendo endpoints sensíveis.
- Testes de regressão críticos cobrindo guardrails mínimos.
- Relatório de gaps publicado em `docs/reports/slice-07-gap-report.md`.
- Todos os serviços core de recrutamento com tenant isolation e audit trail.
- Worker com isolamento de erro por evento.

# SDD — Security Architecture (Slice 08)

## Autenticação
- Bearer token (`dev-{userId}` ou `sess-{uuid}`) validado por `JwtAuthGuard`.
- Providers: DevAuthProvider (local) e CognitoAuthProvider (real-ready).
- Sessões persistidas em `UserSession` com revogação via `/auth/logout`.

## RBAC
- `PermissionsGuard` + `@RequirePermissions()` decorator.
- Permissões atribuídas por role (`admin`, `headhunter`, `client`, `candidate`).
- Verificação de membership por organização em operações tenant-scoped.

## Tenant Isolation
- Todos os services de inteligência validam `candidate.organizationId === vacancy.organizationId`.
- `assertTenantAccess()` verifica membership do ator na organização.
- Worker usa `assertWorkerTenantConsistency()` para rejeitar eventos cross-tenant.
- Serviços de recrutamento (shortlist, evaluations, client-decisions) verificam membership.

### Módulos com Tenant Isolation (Slice 08)
| Módulo | Cross-Tenant Check | Actor Membership | Worker Validation |
|--------|-------------------|-----------------|-------------------|
| candidate-matching | ✓ | ✓ | ✓ |
| candidate-insights | ✓ | ✓ | ✓ |
| recommendation-engine | ✓ | ✓ | ✓ |
| decision-engine | ✓ (vacancy) | ✓ | N/A |
| risk-analysis | ✓ | ✓ | ✓ |
| workflow-automation | ✓ | ✓ | ✓ |

## Proteção de Endpoints Públicos
- `RateLimitGuard`: rate limiting distribuído (Redis) com fallback in-memory, configurável por rota via `@RateLimit`.
- `PublicTokenGuard`: valida formato, existência e expiração do token via cache (`PublicTokenCacheService`) + fallback DB (`GuestSession`, `SmartInterviewSession`, `Candidate`).
- Logging estruturado para tentativas inválidas/expiradas.
- Endpoints protegidos:
  - `GET /candidate/token/:token` — RateLimitGuard + PublicTokenGuard
  - `POST /candidate/onboarding/*` — RateLimitGuard + PublicTokenGuard
  - `GET /smart-interview/candidate/session/:publicToken` — RateLimitGuard
  - `POST /smart-interview/sessions/:id/answers/presign` — RateLimitGuard
  - `POST /smart-interview/sessions/:id/answers/complete` — RateLimitGuard
  - `POST /smart-interview/sessions/:id/submit` — RateLimitGuard

## Frontend
- `apiGet`/`apiPost` interceptam 401 com `token_expired` e limpam localStorage.
- `RequiresToken` component valida token na API ao carregar (bootstrap validation).
- Token expirado redireciona automaticamente para página de entrada.

## Auditoria
- `auditEvent.create()` obrigatório com `actorId`, `action`, `entityType`, `entityId`, `metadata`.
- Verificação automatizada via `test/audit-verification.test.ts`.
- Endpoints críticos cobertos: shortlist, evaluation, client-decision, onboarding, smart-interview review, workflow execution, recommendation, matching, insights, risk, decision-priority.

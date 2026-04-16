# SDD — Security Architecture (Slice 08+)

## Autenticação
- Bearer token (`dev-{userId}` ou `sess-{uuid}`) validado por `JwtAuthGuard`.
- Providers: DevAuthProvider (local) e CognitoAuthProvider (real-ready).
- Sessões persistidas em `UserSession` com revogação via `/auth/logout`.
- **Dev-login restrito**: endpoint `/auth/dev-login` protegido com guard de ambiente (`APP_ENV=local|development|test`); retorna `403 Forbidden` em produção.

## Security Headers
- **Helmet middleware** habilitado globalmente em `main.ts`.
- Headers incluídos: `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, `Strict-Transport-Security`, `X-DNS-Prefetch-Control`, `X-Download-Options`, `X-Permitted-Cross-Domain-Policies`.

## CORS
- Origens permitidas configuradas via `CORS_ORIGINS` env var (lista separada por vírgula).
- Fallback para `localhost:5173,5174` quando não configurado (ambiente local).
- Credentials habilitados com `SameSite` implícito do browser.
- Métodos permitidos: GET, HEAD, PUT, PATCH, POST, DELETE.
- Headers permitidos: Content-Type, Authorization.

## Global Exception Filter
- `GlobalExceptionFilter` registrado globalmente captura todas as exceções.
- `HttpException`: retorna status e body normalmente.
- Exceções não esperadas: retorna `500 Internal server error` genérico; log estruturado server-side com stack trace completo.
- Previne vazamento de stack traces e detalhes internos em produção.

## Graceful Shutdown
- API: `app.enableShutdownHooks()` permite NestJS drenar conexões em SIGTERM/SIGINT.
- Worker: handlers para `unhandledRejection` e `uncaughtException` + wrapping de `run()` com `.catch()`.

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
- `RateLimitGuard`: rate limiting distribuído (Redis) com fallback in-memory, configurável por rota via `@RateLimit`. **Memory leak corrigido**: cleanup periódico de entries expiradas a cada 60s.
- `PublicTokenGuard`: valida formato, existência e expiração do token via cache (`PublicTokenCacheService`) + fallback DB (`GuestSession`, `SmartInterviewSession`, `Candidate`). **Memory leak corrigido**: cleanup periódico de entries expiradas a cada 60s.
- Logging estruturado para tentativas inválidas/expiradas.
- Endpoints protegidos:
  - `GET /candidate/token/:token` — RateLimitGuard + PublicTokenGuard
  - `POST /candidate/onboarding/*` — RateLimitGuard + PublicTokenGuard
  - `GET /smart-interview/candidate/session/:publicToken` — RateLimitGuard + PublicTokenGuard
  - `POST /smart-interview/sessions/:id/answers/presign` — RateLimitGuard
  - `POST /smart-interview/sessions/:id/answers/complete` — RateLimitGuard
  - `POST /smart-interview/sessions/:id/submit` — RateLimitGuard

## Upload Validation
- `StorageGateway.createPresignedUpload()` valida:
  - **Tamanho máximo**: 50MB (`MAX_UPLOAD_BYTES`)
  - **Extensões permitidas**: `.pdf`, `.doc`, `.docx`, `.txt`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.mp4`, `.webm`, `.ogg`, `.mp3`, `.wav`
  - Rejeita uploads fora do whitelist com erro descritivo.

## Cognito Integration
- Client secret lido internamente por `CognitoCallbackService.getClientSecret()` — nunca exposto ao controller.
- `getCandidateAuthConfig()` retorna configuração pública (poolId, clientId, domain, URLs) sem revelar status do secret.
- Social providers: Google, LinkedIn via Cognito Hosted UI.

## Frontend
- `apiGet`/`apiPost` interceptam 401 com `token_expired` e limpam localStorage.
- **Retry + Timeout**: ambos os clients (backoffice-web e candidate-web) implementam:
  - `fetchWithRetry()` com exponential backoff (3 tentativas)
  - AbortController timeout de 30s
  - Tratamento de 429 (rate limit) com Retry-After
- `RequiresToken` component valida token na API ao carregar (bootstrap validation).
- Token expirado redireciona automaticamente para página de entrada.

## Integrações Externas
- **OpenAI**: timeout de 30s configurável via `OPENAI_TIMEOUT_MS`, `maxRetries: 1`. Previne requests pendurados indefinidamente.
- **Comprehend/Transcribe**: fallback para mocks quando feature flag desabilitado.

## Cascading Deletes (Database)
- Todas as relações no Prisma schema possuem política `onDelete` explícita:
  - `Cascade`: filhos dependentes (applications, evaluations, shortlist items, embeddings, etc.)
  - `Restrict`: referências críticas (evaluator, reviewer, vacancy creator) — impede deleção acidental
  - `SetNull`: referências opcionais (matchingScore, workflowSuggestion, tenantSettings)

## Auditoria
- `auditEvent.create()` obrigatório com `actorId`, `action`, `entityType`, `entityId`, `metadata`.
- Verificação automatizada via `test/audit-verification.test.ts`.
- Endpoints críticos cobertos: shortlist, evaluation, client-decision, onboarding, smart-interview review, workflow execution, recommendation, matching, insights, risk, decision-priority.

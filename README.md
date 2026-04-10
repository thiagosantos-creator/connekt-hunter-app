# Connekt Hunter App Monorepo

Baseline técnica com **Vertical Slice 01** estabilizado + **Vertical Slice 02** (Auth real-ready + RBAC end-to-end + staging prep) + **Vertical Slice 03** (Smart Interview mock end-to-end) + **Vertical Slice 04** (integrações reais com fallback e observabilidade básica) + **Vertical Slice 05** (inteligência de produto assistiva) + **Vertical Slice 06** (automação inteligente e recomendações assistidas) + **Vertical Slice 07** (validação global, gap analysis e hardening) + **Vertical Slice 08** (segurança defensiva, tenant isolation e e2e integrado) + **Vertical Slice 09** (rate limiting distribuído, token cache Redis, integração real e tracing).

## Stack
- pnpm workspaces + Turbo
- NestJS + Prisma + PostgreSQL
- Worker (resume parsing stub)
- React + Vite (backoffice-web, candidate-web)

## Acceptance gate (Slice 01)
Comandos esperados:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose -f docker-compose.dev.yml up -d
```

> Neste ambiente de execução, `pnpm install` pode falhar por bloqueio de rede/proxy para o registry público.

## Setup local
```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d postgres redis minio
pnpm --filter @connekt/db prisma:generate
pnpm --filter @connekt/db prisma:migrate
pnpm --filter @connekt/db prisma:seed
```

## Apps
```bash
pnpm --filter api dev
pnpm --filter worker dev
pnpm --filter backoffice-web dev
pnpm --filter candidate-web dev
```

## API — endpoints principais
### Health
- `GET /health`

### Auth (Slice 02)
- `POST /auth/login`
- `POST /auth/dev-login`
- `GET /auth/session`
- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/guest-upgrade`

### Fluxo recrutamento
- `POST /vacancies`
- `GET /vacancies`
- `POST /candidates/invite`
- `GET /candidate/token/:token`
- `POST /candidate/onboarding/basic`
- `POST /candidate/onboarding/consent`
- `POST /candidate/onboarding/resume`
- `GET /applications`
- `POST /shortlist`
- `POST /evaluations`
- `POST /client-decisions`
- `POST /smart-interview/templates`
- `GET /smart-interview/templates?vacancyId=`
- `POST /smart-interview/templates/:templateId/generate-questions`
- `PUT /smart-interview/templates/:templateId/questions`
- `POST /smart-interview/sessions`
- `GET /smart-interview/sessions/:sessionId/review`
- `POST /smart-interview/sessions/:sessionId/human-review`
- `GET /smart-interview/candidate/session/:publicToken`
- `POST /smart-interview/sessions/:sessionId/answers/presign`
- `POST /smart-interview/sessions/:sessionId/answers/complete`
- `POST /smart-interview/sessions/:sessionId/submit`
- `POST /candidate-matching/compute`
- `GET /candidate-matching/:vacancyId/:candidateId`
- `POST /candidate-matching/compare`
- `POST /candidate-insights/generate`
- `GET /candidate-insights/:vacancyId/:candidateId`
- `POST /candidate-ranking/generate`
- `GET /candidate-ranking/:vacancyId`
- `POST /candidate-ranking/override`
- `POST /recommendation-engine/generate`
- `GET /recommendation-engine/:vacancyId`
- `POST /risk-analysis/analyze`
- `GET /risk-analysis?candidateId=&vacancyId=`
- `POST /decision-engine/priority/calculate`
- `POST /workflow-automation/suggest`
- `POST /workflow-automation/execute`

## Vertical Slice 02
Implementado nesta fase:
- Auth provider abstraction (dev + placeholder IAM)
- Sessões persistidas (`UserSession`) e token `sess-*`
- RBAC por permissions guard
- Tenant-aware checks em criação de vacancy/invite
- Guest candidate -> account upgrade (`/auth/guest-upgrade`)
- Feature flags para integrações reais (`FeatureFlag`)
- Preparação de dados para social/MFA (`AuthIdentity`, `MfaPreference`, `GuestSession`)

## Smoke flow (manual)
1. rodar seed
2. login headhunter (`/auth/dev-login`)
3. criar vacancy
4. convidar candidate
5. candidate entra por token no candidate-web
6. onboarding básico + consent + resume
7. worker processa outbox
8. application aparece no backoffice
9. shortlist + evaluation
10. client decision (`approve|reject|interview|hold`)
11. validar `AuditEvent` e `MessageDispatch`

## ADRs
- `docs/adr/008-auth-strategy.md`
- `docs/adr/009-provider-abstraction.md`
- `docs/adr/010-dev-auth-vs-real-auth.md`
- `docs/adr/011-staging-environment-strategy.md`
- `docs/adr/012-feature-flags-real-integrations.md`

## SDDs
- `docs/sdd/README.md`
- `docs/sdd/001-system-context.md`
- `docs/sdd/002-auth-session.md`
- `docs/sdd/003-recruitment-flow.md`


## Vertical Slice 04
Implementado nesta fase:
- Registry/config central de integrações + feature flags por ambiente.
- Storage gateway (S3 real-ready + MinIO fallback local) com metadata de assets.
- Email gateway (SES real-ready + Mailhog fallback) com eventos/webhooks básicos.
- Auth provider Cognito real-ready com fallback para dev auth.
- AI gateway real-ready com logs de execução e fallback mock.
- CV parser/transcription gateways real-ready com fallback e persistência de metadata.

### Variáveis de ambiente
Consulte `.env.example` para flags `FF_*_REAL`, providers e placeholders de secrets.

### Smoke staging (providers reais)
1. `APP_ENV=staging`
2. ativar `FF_*_REAL=true` por integração desejada
3. preencher credenciais reais (AWS/AI/gateways)
4. validar `GET /health` e conferir providers ativos por integração
5. executar fluxo completo de convite -> onboarding -> smart interview -> review humano

### Documentação adicional
- `docs/adr/014-vertical-slice-04-real-integrations-fallback.md`
- `docs/sdd/integrations/*`
- `docs/sdd/modules/*`


## Vertical Slice 05
Implementado nesta fase:
- Matching score com breakdown por dimensão e persistência de embeddings.
- Geração assistiva de evidências, explicações, insights e comparativos entre candidatos.
- Ranking assistido com snapshot e possibilidade de override humano.
- Reprocessamento assíncrono no worker (`matching:compute`, `insights:generate`, `comparison:generate`).
- Novas telas no backoffice para score, insights, comparador e reorder manual.

## Vertical Slice 06
Implementado nesta fase:
- Recommendation engine para ações sugeridas com explicação obrigatória e persistência.
- Decision engine para priorização dinâmica por vaga (`CandidatePriorityScore`).
- Risk analysis com sinais (`RiskSignal`) + avaliação consolidada (`RiskEvaluation`).
- Workflow automation assistida com aprovação humana (`WorkflowSuggestion` + `AutomationExecution`).
- Auditoria para geração de recomendações, cálculo de prioridade, análise de risco e execução assistida.
- Worker com novos tópicos: `recommendation:generate`, `risk:analyze`, `automation:trigger`.


## Vertical Slice 07
Implementado nesta fase:
- Gap analysis global comparando SDDs e implementação com classificação por severidade.
- Hardening de Smart Interview para estados válidos, vínculo pergunta-template e revisão humana pós-submit.
- Correção de tenant boundary em integrações de transcrição e em workflow automation.
- Logs estruturados para seleção de providers e fallback de integrações.
- Testes adicionais (unitários + contrato e2e) para validar guardrails críticos.
- Relatório consolidado em `docs/reports/slice-07-gap-report.md`.

## Vertical Slice 08
Implementado nesta fase:
- Tenant isolation defensivo em módulos de inteligência (matching, insights, recommendation, decision, risk).
- Validação `candidate.organizationId === vacancy.organizationId` em todos os services de inteligência.
- `assertTenantAccess()` com membership check em todos os endpoints protegidos.
- Rate limiting (`RateLimitGuard`, 30 req/min por IP) em endpoints públicos do candidato.
- Token validation (`PublicTokenGuard`) com expiração checada em `GuestSession`.
- Worker defensivo com `assertWorkerTenantConsistency` por evento.
- Frontend com tratamento de token expirado no bootstrap.
- Suite e2e real (contrato) para tenant isolation, rate limiting, worker defense e fluxos ponta a ponta.
- 30+ novos testes unitários para módulos de inteligência e onboarding.
- Verificação automatizada de audit trail em endpoints críticos.
- Documentação de segurança (`docs/sdd/06-security/spec.md`) e testes (`docs/sdd/07-testing/spec.md`).

### Documentação adicional
- `docs/adr/015-defensive-security-tenant-isolation.md`
- `docs/sdd/06-security/spec.md`
- `docs/sdd/07-testing/spec.md`


## Vertical Slice 09
Implementado nesta fase:
- Rate limiting distribuído com Redis (+ fallback em memória) e configuração por rota.
- Cache de token público por hash com TTL curto e invalidação em cenários críticos.
- Suíte de integração com stack real (API + Postgres + worker + Redis opcional).
- Tracing/correlação mínima para API e worker com logs estruturados.
- ADRs 016/017/018/019 e SDDs atualizados.

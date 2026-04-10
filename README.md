# Connekt Hunter App Monorepo

Baseline técnica com **Vertical Slice 01** estabilizado + **Vertical Slice 02** (Auth real-ready + RBAC end-to-end + staging prep).

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

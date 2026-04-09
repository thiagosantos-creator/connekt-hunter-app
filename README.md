# Connekt Hunter App Monorepo

Baseline técnica + Vertical Slice 01 para recrutamento multi-tenant.

## Stack
- Monorepo: pnpm + Turbo
- Backend: NestJS (modular monolith) + Prisma + PostgreSQL
- Jobs: worker com stub de processamento de CV (base para BullMQ)
- Storage: MinIO (S3 compatível)
- Frontend: backoffice-web e candidate-web (React + Vite)

## Estrutura
- `apps/api`: API (auth dev, vacancies, candidates, onboarding, shortlist, client decision)
- `apps/worker`: worker inicial para parsing mock de CV
- `apps/backoffice-web`: shell de backoffice
- `apps/candidate-web`: onboarding candidato por token
- `packages/db`: schema Prisma, migrations e seed
- `docs/adr`: ADRs essenciais

## Setup local
```bash
corepack enable
pnpm install
cp .env.example .env # opcional, ou exportar DATABASE_URL
pnpm --filter @connekt/db prisma:generate
pnpm --filter @connekt/db prisma:migrate
pnpm --filter @connekt/db prisma:seed
```

## Baseline checks
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Rodando com docker compose
```bash
docker compose -f docker-compose.dev.yml up -d postgres redis minio
docker compose -f docker-compose.dev.yml up api worker
```

## Rodando apps localmente
```bash
pnpm --filter api dev
pnpm --filter worker dev
pnpm --filter backoffice-web dev
pnpm --filter candidate-web dev
```

## Healthcheck API
`GET http://localhost:3000/health`

## Vertical Slice 01 (demo)
1. Seed cria `organization`, `admin`, `headhunter`, `client`.
2. Headhunter login dev: `POST /auth/dev-login`.
3. Cria vaga: `POST /vacancies`.
4. Convida candidato por token: `POST /candidates/invite`.
5. Candidate acessa token em candidate-web.
6. Onboarding obrigatório:
   - `POST /candidate/onboarding/basic`
   - `POST /candidate/onboarding/consent`
   - `POST /candidate/onboarding/resume`
7. CV salvo com provider `minio` (object key mock).
8. Worker processa evento `resume.uploaded` e cria parse mock.
9. Application criada no invite.
10. Backoffice lista applications: `GET /applications`.
11. Headhunter adiciona shortlist: `POST /shortlist`.
12. Headhunter cria parecer inicial: `POST /evaluations`.
13. Client visualiza shortlist no backoffice (view preparada).
14. Client decide: `POST /client-decisions` (`approve|reject|interview|hold`).
15. Audit trail persistido em `auditEvents`.
16. Communication log persistido em `messageDispatches`.

## Módulos implementados na etapa
- auth-iam (dev)
- rbac-tenancy
- organizations-memberships
- vacancy-management
- candidate-crm
- candidate-onboarding
- application-management
- resume-processing (stub)
- shortlist-evaluation
- client-review
- communications (mock/local)
- audit-admin
- integrations-hub (mocks)

## Frontend routes/views entregues
### backoffice-web
- auth/dev entry (placeholder)
- vacancies list/create (placeholder)
- candidates list/detail (placeholder)
- applications list/detail (placeholder)
- shortlist view (placeholder)
- client review view (placeholder)

### candidate-web
- token entry (placeholder)
- onboarding wizard 3 passos (placeholder)
- status screen (placeholder)
- feedback upload/processamento (placeholder)

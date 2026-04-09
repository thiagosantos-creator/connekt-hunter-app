# Connekt Hunter App Monorepo

Baseline técnica + **Vertical Slice 01** (fluxo ponta a ponta) para recrutamento multi-tenant.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Monorepo | pnpm workspaces + Turbo |
| Backend | NestJS (modular monolith) + Prisma + PostgreSQL |
| Jobs | Worker com stub de resume parsing (base para BullMQ/Redis) |
| Storage | MinIO object keys (integração real adicionada depois) |
| Frontends | React 19 + Vite + React Router v6 |
| Tests | Vitest (unit + e2e contract) |

---

## Estrutura do monorepo

```
connekt-hunter-app/
├── apps/
│   ├── api/                # NestJS API — módulos do Vertical Slice 01
│   │   └── src/modules/
│   │       ├── auth/           # POST /auth/dev-login
│   │       ├── health/         # GET /health
│   │       ├── organizations/  # GET /organizations
│   │       ├── vacancies/      # POST/GET /vacancies
│   │       ├── candidates/     # POST /candidates/invite, GET /candidate/token/:token
│   │       ├── onboarding/     # POST /candidate/onboarding/{basic,consent,resume}
│   │       ├── applications/   # GET /applications
│   │       ├── shortlist/      # POST /shortlist
│   │       ├── evaluations/    # POST /evaluations
│   │       ├── client-decisions/ # POST /client-decisions
│   │       └── audit/          # AuditService (interno)
│   ├── worker/             # Worker de resume parsing (stub, polling outbox)
│   ├── backoffice-web/     # React SPA — headhunter e client
│   └── candidate-web/      # React SPA — onboarding do candidato
├── packages/
│   └── db/                 # @connekt/db — Prisma client + schema + seed
├── docs/adr/               # 7 ADRs arquiteturais
└── tests/e2e/              # Testes contract do Vertical Slice 01
```

---

## Pré-requisitos

- Node.js ≥ 20
- pnpm ≥ 10
- Docker + Docker Compose (para infraestrutura local)

---

## Setup local rápido

```bash
# 1. Instalar pnpm (se necessário)
npm install -g pnpm@10

# 2. Instalar dependências
pnpm install

# 3. Copiar variáveis de ambiente
cp .env.example .env

# 4. Subir infraestrutura (Postgres, Redis, MinIO)
docker compose -f docker-compose.dev.yml up -d postgres redis minio

# 5. Gerar Prisma Client
pnpm --filter @connekt/db prisma:generate

# 6. Aplicar migration
pnpm --filter @connekt/db prisma:migrate

# 7. Popular seed (org + admin + headhunter + client)
pnpm --filter @connekt/db prisma:seed
```

---

## Verificações da baseline

```bash
pnpm lint        # turbo lint — todos os packages
pnpm typecheck   # turbo typecheck — TypeScript em todos packages
pnpm test        # turbo test — todos os testes (vitest)
pnpm build       # turbo build — compila todos os packages
```

---

## Rodando localmente

```bash
# API (porta 3000)
pnpm --filter api dev

# Worker (processa outbox uma vez e encerra)
pnpm --filter worker dev

# Backoffice (porta 5173)
pnpm --filter backoffice-web dev

# Candidate portal (porta 5174 ou próxima disponível)
pnpm --filter candidate-web dev
```

Ou tudo via Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up
```

---

## Endpoints da API (Vertical Slice 01)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | /health | Healthcheck (verifica banco) |
| POST | /auth/dev-login | Login dev (retorna token `dev-{userId}`) |
| GET | /organizations | Lista organizações |
| POST | /vacancies | Cria vaga |
| GET | /vacancies | Lista vagas |
| POST | /candidates/invite | Convida candidato (cria token + application) |
| GET | /candidate/token/:token | Retorna dados do candidato pelo token |
| POST | /candidate/onboarding/basic | Salva perfil básico |
| POST | /candidate/onboarding/consent | Registra aceite LGPD/termos |
| POST | /candidate/onboarding/resume | Registra upload de CV (cria OutboxEvent) |
| GET | /applications | Lista applications com candidato e vaga |
| POST | /shortlist | Adiciona application na shortlist |
| POST | /evaluations | Registra parecer do headhunter |
| POST | /client-decisions | Registra decisão do cliente (`approve/reject/interview/hold`) |

---

## Rotas do Frontend

### backoffice-web (porta 5173)
| Rota | View |
|------|------|
| `/login` | Login dev (email + dev token) |
| `/vacancies` | Listar vagas + criar vaga |
| `/candidates` | Convidar candidato |
| `/applications` | Listar applications com status |
| `/shortlist` | Shortlist + avaliação |
| `/client-review` | Decisão do cliente por application |

### candidate-web (porta 5174+)
| Rota | View |
|------|------|
| `/` | TokenEntry — entrada pelo token de convite |
| `/onboarding/basic` | Step 1 — Nome e telefone |
| `/onboarding/consent` | Step 2 — Aceite LGPD + Termos |
| `/onboarding/resume` | Step 3 — Upload de CV |
| `/status` | Confirmação da candidatura |

---

## Vertical Slice 01 — fluxo ponta a ponta

```
seed → headhunter login → cria vaga → convida candidato
     → candidato acessa token → onboarding (3 steps)
     → worker processa resume → application criada
     → headhunter vê applications → shortlist + parecer
     → client vê shortlist → decide (approve/reject/interview/hold)
     → audit trail persistido
```

### Demo rápido via curl

```bash
BASE=http://localhost:3000

# 1. Login do headhunter
TOKEN=$(curl -s -X POST $BASE/auth/dev-login \
  -H 'Content-Type: application/json' \
  -d '{"email":"headhunter@demo.local"}' | jq -r .token)

# 2. Criar vaga
VACANCY=$(curl -s -X POST $BASE/vacancies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"organizationId":"org_demo","title":"Senior Engineer","description":"Backend role","createdBy":"<headhunter-id>"}' | jq -r .id)

# 3. Convidar candidato
CANDIDATE=$(curl -s -X POST $BASE/candidates/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"organizationId\":\"org_demo\",\"email\":\"candidate@test.com\",\"vacancyId\":\"$VACANCY\"}")

CTOKEN=$(echo $CANDIDATE | jq -r .token)

# 4. Onboarding candidato
curl -s -X POST $BASE/candidate/onboarding/basic \
  -H 'Content-Type: application/json' \
  -d "{\"token\":\"$CTOKEN\",\"fullName\":\"João Silva\",\"phone\":\"+55 11 9999-9999\"}"

curl -s -X POST $BASE/candidate/onboarding/consent \
  -H 'Content-Type: application/json' \
  -d "{\"token\":\"$CTOKEN\"}"

curl -s -X POST $BASE/candidate/onboarding/resume \
  -H 'Content-Type: application/json' \
  -d "{\"token\":\"$CTOKEN\",\"filename\":\"joao-cv.pdf\"}"

# 5. Rodar worker (processa outbox)
pnpm --filter worker dev

# 6. Ver applications
curl -s $BASE/applications -H "Authorization: Bearer $TOKEN" | jq .

# 7. Shortlist
APP_ID=$(curl -s $BASE/applications -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
ITEM=$(curl -s -X POST $BASE/shortlist \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"applicationId\":\"$APP_ID\"}")

# 8. Parecer do headhunter
curl -s -X POST $BASE/evaluations \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"applicationId\":\"$APP_ID\",\"evaluatorId\":\"<headhunter-id>\",\"comment\":\"Forte perfil técnico\"}"

# 9. Decisão do cliente
ITEM_ID=$(echo $ITEM | jq -r .id)
curl -s -X POST $BASE/client-decisions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"shortlistItemId\":\"$ITEM_ID\",\"reviewerId\":\"<client-id>\",\"decision\":\"approve\"}"
```

---

## Módulos implementados

| Módulo | Status |
|--------|--------|
| auth-iam (dev/local) | ✅ |
| rbac-tenancy | ✅ |
| organizations-memberships | ✅ |
| vacancy-management | ✅ |
| candidate-crm | ✅ |
| candidate-onboarding | ✅ |
| application-management | ✅ |
| resume-processing (stub) | ✅ |
| shortlist-evaluation | ✅ |
| client-review | ✅ |
| communications (mock) | ✅ |
| audit-admin | ✅ |
| integrations-hub (mocks) | ✅ |

---

## ADRs

| ADR | Decisão |
|-----|---------|
| [001](docs/adr/001-modular-monolith-nestjs.md) | Modular Monolith em NestJS |
| [002](docs/adr/002-postgresql-jsonb-core.md) | PostgreSQL + JSONB como core de dados |
| [003](docs/adr/003-redis-bullmq-jobs.md) | Redis/BullMQ para jobs |
| [004](docs/adr/004-minio-s3-files.md) | MinIO/S3 para arquivos |
| [005](docs/adr/005-provider-agnostic-integrations.md) | Provider-agnostic integrations |
| [006](docs/adr/006-candidate-guest-tokenized.md) | Candidato guest/tokenizado |
| [007](docs/adr/007-assistive-auditable-ai.md) | IA assistiva e auditável |


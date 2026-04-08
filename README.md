# connekt-hunter-app

Base técnica e documental da plataforma operacional da Connekt Hunter.

> O site/landing page institucional está fora deste repositório. Aqui ficam somente frontend, backend, data, infra e documentação SDD.

## Stack alvo

- pnpm workspaces
- Turborepo
- TypeScript
- Next.js para `backoffice-web` e `candidate-web`
- NestJS para `api` e `worker`
- PostgreSQL + Prisma
- Redis
- S3/MinIO
- Docker + Docker Compose

## Estrutura principal

```text
apps/
  api/
  worker/
  backoffice-web/
  candidate-web/
packages/
  ui/
  design-tokens/
  api-client/
  contracts/
  config/
  db/
  eslint-config/
  tsconfig/
docs/
  sdd/
  adr/
infra/
  docker/
  compose/
  env/
  scripts/
```

## Setup local

```bash
corepack enable
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

## Scripts úteis

```bash
pnpm run dev:backoffice
pnpm run dev:candidate
pnpm run dev:api
pnpm run dev:worker
pnpm run db:generate
./infra/scripts/bootstrap.sh
./infra/scripts/dev-up.sh
```

## Ambiente local com Docker

```bash
docker compose -f infra/compose/docker-compose.dev.yml up --build
```

Serviços previstos no compose:

- postgres
- redis
- minio
- mailhog
- api
- worker
- backoffice-web
- candidate-web

## Documentação

A documentação principal está em `docs/sdd` e segue SDD como fonte primária de entendimento do produto e da arquitetura.

- specs globais: `docs/sdd/00-scope` até `docs/sdd/08-devex`
- specs por módulo: `docs/sdd/modules/*`
- specs por integração: `docs/sdd/integrations/*`
- roadmap futuro: `docs/sdd/future/*`
- decisões arquiteturais: `docs/adr/*`

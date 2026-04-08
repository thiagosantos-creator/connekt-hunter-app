# Arquitetura alvo

## Decisões principais

- monorepo com pnpm workspaces + turborepo + TypeScript
- frontend separado em `backoffice-web` e `candidate-web`
- backend separado em `api` e `worker`
- PostgreSQL como source of truth
- Prisma para schema, migrations e geração futura de client
- Redis para filas, cache e jobs
- S3/MinIO para arquivos e mídia

## Fronteiras de contexto

- `apps/` concentra superfícies executáveis
- `packages/` concentra contratos, UI, config e dados compartilhados
- `docs/sdd` concentra a documentação viva guiada por especificação
- `infra/` concentra execução local e entrega

## Princípios

- documentação primeiro, implementação depois
- módulos coesos com contracts explícitos
- multi-tenant por organização
- payloads flexíveis via JSONB para fluxos assistidos por IA

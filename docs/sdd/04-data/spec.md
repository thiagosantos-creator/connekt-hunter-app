# Estratégia de dados

## Banco principal

PostgreSQL é a fonte primária de verdade para os dados transacionais e operacionais.

## Modelagem inicial

A modelagem usa colunas de auditoria (`createdAt`, `updatedAt`), soft delete (`deletedAt`) e escopo por organização sempre que aplicável.

## Flexibilidade

- campos JSONB para payloads heterogêneos
- estrutura preparada para eventos de outbox
- extensão pgvector considerada futura e opcional na primeira trilha funcional

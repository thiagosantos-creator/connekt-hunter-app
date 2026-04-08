# ADR 0001 - Base do monorepo operacional

## Status

Aceito.

## Decisão

Usar pnpm workspaces + turborepo + TypeScript como base comum para frontend, backend, data, infra e documentação SDD.

## Consequências

- facilita cache de build e isolamento por workspace
- simplifica automação por agentes
- exige disciplina de contratos e documentação modular

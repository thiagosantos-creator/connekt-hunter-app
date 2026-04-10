# SDD-001 — System Context

## Visão geral
A solução é um monorepo com API, worker e duas aplicações web para operação do fluxo de recrutamento:
- `apps/api`
- `apps/worker`
- `apps/backoffice-web`
- `apps/candidate-web`

## Capacidades principais
1. Gestão de vagas.
2. Convite de candidatos.
3. Onboarding de candidato (dados básicos, consentimento, currículo).
4. Processamento assíncrono de eventos e tarefas de worker.
5. Curadoria de aplicações (shortlist, avaliação e decisão do cliente).

## Fronteiras e integrações
- Banco relacional via Prisma (`packages/db`).
- Integrações externas devem permanecer desacopladas e atrás de feature flags.
- Fallback local de desenvolvimento (dev auth + mocks) deve ser preservado.

## Critérios de integridade
- Sem breaking change em endpoint existente sem versionamento.
- Fluxo crítico de slice ativo deve permanecer funcional ponta-a-ponta.
- Lint/typecheck/test/build devem permanecer estáveis no monorepo.

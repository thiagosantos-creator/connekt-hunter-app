# SDD — Connekt Hunter

Este diretório centraliza as **Software Design Descriptions (SDD)** dos slices ativos.

## Objetivo
- Documentar o comportamento esperado do sistema com foco em fluxo de negócio.
- Reduzir risco de regressão em mudanças incrementais.
- Guiar evolução dos vertical slices com rastreabilidade para ADRs.

## Escopo atual (revisado em 2026-04-10)

### SDDs base
- `001-system-context.md`: contexto de sistema e limites de domínio.
- `002-auth-session.md`: autenticação, sessão e autorização.
- `003-recruitment-flow.md`: fluxo fim-a-fim de recrutamento.
- `004-smart-interview.md`: entrevista estruturada assíncrona (Slice 03).
- `007-global-validation-hardening.md`: critérios de validação global, gap analysis e hardening (Slice 07).

### SDDs por domínio transversal
- `05-infra/spec.md`: Redis, rate limiting distribuído, token cache e fallback.
- `06-security/spec.md`: autenticação, RBAC, isolamento de tenant e guards públicos.
- `07-testing/spec.md`: estratégia de testes unitários, contrato/e2e e verificação de auditoria.
- `08-devex/spec.md`: observabilidade mínima, tracing e estratégia de rollout.

### SDDs por módulos e integrações
- `modules/*/spec.md`: regras funcionais por módulo (matching, insights, ranking, risk, workflow etc).
- `integrations/*/spec.md`: contratos de integração (S3/SES/Cognito/AI/CV/transcription/webhooks).

## Visão de dependências e impacto por camada
- **API (`apps/api`)**: depende de `@connekt/db` (Prisma), policies de auth/RBAC, módulos de domínio e gateways provider-agnostic.
- **Worker (`apps/worker`)**: depende de `@connekt/db`, consome tópicos de outbox e aplica validações defensivas de tenant.
- **Backoffice (`apps/backoffice-web`)**: depende da API e de `@connekt/ui`, com rotas protegidas por papel/permissão.
- **Candidate Portal (`apps/candidate-web`)**: depende da API para fluxo tokenizado (onboarding + interview) com fallback local.
- **Infra externa (opt-in por feature flag)**: Redis, S3/MinIO, SES/Mailhog, Cognito/dev-auth, AI gateways e parsers.

## Rastreabilidade SDD -> ADR
- Estratégia de auth/identidade: ADR 008, 010.
- Provider abstraction/fallback: ADR 009, 012, 014.
- Segurança defensiva e tenant isolation: ADR 015.
- Redis/rate limiting/token cache/tracing: ADR 016, 017, 018, 019.

## Regras de manutenção
1. Toda alteração relevante de comportamento deve atualizar a SDD correspondente.
2. Alterações arquiteturais continuam sendo registradas em `docs/adr/*`.
3. Mudanças de API devem atualizar README e contrato e2e conforme AGENTS.

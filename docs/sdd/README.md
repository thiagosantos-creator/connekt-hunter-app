# SDD — Connekt Hunter

Este diretório centraliza as **Software Design Descriptions (SDD)** dos slices ativos.

## Objetivo
- Documentar o comportamento esperado do sistema com foco em fluxo de negócio.
- Reduzir risco de regressão em mudanças incrementais.
- Guiar evolução dos vertical slices com rastreabilidade para ADRs.

## Escopo inicial
- `001-system-context.md`: contexto de sistema e limites de domínio.
- `002-auth-session.md`: autenticação, sessão e autorização.
- `003-recruitment-flow.md`: fluxo fim-a-fim de recrutamento.

## Regras de manutenção
1. Toda alteração relevante de comportamento deve atualizar a SDD correspondente.
2. Alterações arquiteturais continuam sendo registradas em `docs/adr/*`.
3. Mudanças de API devem atualizar README e contrato e2e conforme AGENTS.

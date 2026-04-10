# ADR 013 — Smart Interview mock orchestration

## Status
Accepted — 2026-04-10

## Context
Vertical Slice 03 precisa entregar entrevista assíncrona com vídeo sem acoplar integração externa real (Zoom/LLM) e sem quebrar fluxo local de desenvolvimento.

## Decision
- Introduzir módulo `smart-interview` com estados explícitos de sessão/resposta.
- Manter geração de perguntas, transcrição e análise como adapters mock.
- Orquestrar processamento por `OutboxEvent` + worker, preservando estratégia definida para ambiente local e staging.
- Proteger rotas administrativas via RBAC; manter acesso candidato por token público de sessão.

## Consequences
- Entrega incremental auditável sem dependência de provider externo.
- Contrato pronto para substituir adapters mock por integrações reais sob feature flag.
- Mantém convivência entre dev auth e providers reais planejados nos ADRs 008, 009, 010 e 012.

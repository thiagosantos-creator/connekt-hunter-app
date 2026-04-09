# ADR 001 - modular-monolith-nestjs

## Status
Accepted

## Context
Vertical Slice 01 requer arquitetura simples para entrega rápida, mantendo caminho de evolução para produção.

## Decision
modular-monolith-nestjs adotado como padrão nesta baseline, com interfaces e adapters para desacoplamento.

## Consequences
- Reduz acoplamento entre domínio e integrações externas.
- Mantém rastreabilidade com audit trail.
- Permite substituir mocks por providers reais em fases futuras.

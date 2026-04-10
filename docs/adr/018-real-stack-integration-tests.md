# ADR 018: Real stack integration testing

## Contexto
E2E anterior era majoritariamente contract-level.

## Decisão
Adicionar suíte de integração que executa API real + Postgres real + worker real (com processamento de outbox) para fluxos críticos.

## Consequências
- Maior confiança em runtime real.
- Testes mais lentos e dependentes de infraestrutura local.

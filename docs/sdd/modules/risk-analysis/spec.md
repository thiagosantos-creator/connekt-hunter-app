# Risk Analysis — Vertical Slice 06

## Objetivo
Detectar sinais de risco e consolidar avaliação por candidato/vaga.

## Capacidades
- Detectar padrões via `ai-provider-gateway`.
- Persistir sinais (`RiskSignal`) e avaliação (`RiskEvaluation`).
- Nunca bloquear decisão humana.

## Tenant Isolation (Slice 08)
- Validação de existência de candidato e vaga.
- Cross-tenant check: `candidate.organizationId === vacancy.organizationId`.
- Actor membership validation via `assertTenantAccess()`.
- Worker job `risk:analyze` usa `assertWorkerTenantConsistency`.

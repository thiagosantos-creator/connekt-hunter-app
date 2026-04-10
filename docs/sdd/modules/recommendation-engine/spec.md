# Recommendation Engine — Vertical Slice 06

## Objetivo
Gerar recomendações acionáveis para candidatos por vaga com explicações claras.

## Capacidades
- Geração de recomendações com `ai-provider-gateway`.
- Persistência em `CandidateRecommendation`.
- Explicação obrigatória e trilha de auditoria.

## Tenant Isolation (Slice 08)
- Validação de existência de candidato e vaga.
- Cross-tenant check: `candidate.organizationId === vacancy.organizationId`.
- Actor membership validation via `assertTenantAccess()`.
- List endpoint verifica ownership da vacancy.
- Worker job `recommendation:generate` usa `assertWorkerTenantConsistency`.

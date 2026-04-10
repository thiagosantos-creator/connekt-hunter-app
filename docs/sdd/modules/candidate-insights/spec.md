# Module Spec — Candidate Insights

- Gera `candidateInsight` por par candidato/vaga.
- Consolida resumo, forças, riscos e recomendações assistivas.
- Cada execução registra explicação em `aiExplanation` + `AiExecutionLog`.
- Permite reprocessamento via worker topic `insights:generate`.
- Insights são apoio para decisão humana e não substituem review.

## Tenant Isolation (Slice 08)
- Validação de existência de candidato e vaga antes da geração.
- Cross-tenant check: `candidate.organizationId === vacancy.organizationId`.
- Actor membership validation via `assertTenantAccess()`.
- Worker job `insights:generate` usa `assertWorkerTenantConsistency` para rejeitar eventos cross-tenant.

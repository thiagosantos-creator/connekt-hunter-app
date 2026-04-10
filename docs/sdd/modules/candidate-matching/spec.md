# Module Spec — Candidate Matching

- Calcula `matchingScore` por aplicação (vaga + candidato).
- Gera `matchingBreakdown` por dimensão (`experience`, `interview`, `profile`, `resume`).
- Persiste embeddings (`candidateEmbedding`, `vacancyEmbedding`) para reprocessamento incremental.
- Gera sempre `aiEvidence` e `aiExplanation` com trilha auditável.
- Dispara logs em `AiExecutionLog` e `AuditEvent`.
- IA é assistiva: nunca executa decisão final automática.

## Tenant Isolation (Slice 08)
- Validação de existência da Application antes do cálculo.
- Cross-tenant check: `candidate.organizationId === vacancy.organizationId`.
- Actor membership validation via `assertTenantAccess()`.
- `compareCandidates` valida existência e ownership da vacancy.
- Todas as operações rejeitam payloads cross-tenant com `ForbiddenException`.
- Worker job `matching:compute` usa `assertWorkerTenantConsistency` para rejeitar eventos cross-tenant.

# Module Spec — Candidate Matching

- Calcula `matchingScore` por aplicação (vaga + candidato).
- Gera `matchingBreakdown` por dimensão (`experience`, `interview`, `profile`, `resume`).
- Persiste embeddings (`candidateEmbedding`, `vacancyEmbedding`) para reprocessamento incremental.
- Gera sempre `aiEvidence` e `aiExplanation` com trilha auditável.
- Dispara logs em `AiExecutionLog` e `AuditEvent`.
- IA é assistiva: nunca executa decisão final automática.

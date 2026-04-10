# Module Spec — Candidate Insights

- Gera `candidateInsight` por par candidato/vaga.
- Consolida resumo, forças, riscos e recomendações assistivas.
- Cada execução registra explicação em `aiExplanation` + `AiExecutionLog`.
- Permite reprocessamento via worker topic `insights:generate`.
- Insights são apoio para decisão humana e não substituem review.

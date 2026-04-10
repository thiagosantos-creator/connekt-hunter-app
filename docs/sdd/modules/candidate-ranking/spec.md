# Module Spec — Candidate Ranking

- Produz `candidateRankingSnapshot` por vaga com ordenação inicial assistida por score.
- Inclui racional por candidato gerado via AI gateway.
- Suporta override humano com reorder manual e flag `manualOverride=true`.
- Mantém audit trail (`ranking.generated`, `ranking.overridden`).
- Reprocessamento assíncrono disponível via worker (`matching:compute`, `comparison:generate`).

# Module Spec — AI Orchestration

- Usa `AiGateway` para geração de perguntas, análise de entrevistas e inteligência de produto.
- Operações do Slice 05 suportadas: explicação de matching, geração de insights, comparativos e racional de ranking.
- Sempre grava metadados de execução (`AiExecutionLog`).
- Estratégia fallback: real -> mock sem interromper fluxo.
- Override humano obrigatório no fechamento (IA assistiva-only).
- Evidências e explicações são mandatórias para recomendações.

# Module Spec — AI Orchestration

- Usa `AiGateway` para geração de perguntas e análise de entrevistas.
- Sempre grava metadados de execução (`AiExecutionLog`).
- Estratégia fallback: real -> mock sem interromper fluxo.
- Override humano obrigatório no fechamento.

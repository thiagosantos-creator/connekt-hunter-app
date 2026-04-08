    # Smart Interview

    ## Objetivo
    Sessões de entrevista inteligente com roteiros e respostas estruturadas.

    ## Responsabilidades iniciais
    - instanciar sessão e perguntas

- registrar respostas multimodais
- alimentar IA e transcrições

  ## Entradas e saídas esperadas
  - comandos e consultas HTTP placeholder via API
  - eventos internos para worker e integrações quando aplicável
  - persistência orientada por PostgreSQL + JSONB

  ## Dependências iniciais
  - `packages/contracts`
  - `packages/db`
  - módulos adjacentes conforme jornada do produto

  ## Critérios desta fase
  - módulo NestJS criado
  - controller/service/DTO/entity placeholder disponíveis
  - teste skeleton criado
  - rota de summary pronta para evolução

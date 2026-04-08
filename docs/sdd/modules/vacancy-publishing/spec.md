    # Vacancy Publishing

    ## Objetivo
    Publicação e distribuição de vagas para canais públicos e privados.

    ## Responsabilidades iniciais
    - gerar slugs e links públicos

- orquestrar canais de publicação
- medir estado de publicação por canal

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

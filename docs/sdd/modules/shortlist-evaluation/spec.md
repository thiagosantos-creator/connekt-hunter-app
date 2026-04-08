    # Shortlist Evaluation

    ## Objetivo
    Curadoria operacional de shortlists e avaliações internas.

    ## Responsabilidades iniciais
    - organizar shortlist por vaga

- manter ranking e status por item
- registrar scorecards internos

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

    # Resume Processing

    ## Objetivo
    Ingestão, armazenamento e parsing estruturado de currículos.

    ## Responsabilidades iniciais
    - upload e storage de CV

- parsing com payloads flexíveis
- revisão humana dos dados extraídos

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

    # Organizations Memberships

    ## Objetivo
    Gestão de organizações, times e associação de usuários.

    ## Responsabilidades iniciais
    - cadastro e lifecycle de organizações

- vínculos de membros e perfis internos
- convites e ativação futura por e-mail

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

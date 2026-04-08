# Estratégia de infraestrutura local

## Ambiente de desenvolvimento

O ambiente local usa Docker Compose com PostgreSQL, Redis, MinIO, MailHog, API, worker e os dois frontends.

## Objetivos

- setup previsível para desenvolvedores e agentes
- isolamento de dependências locais
- base para CI e para futuras imagens de deploy

## Itens futuros

- observabilidade local padrão
- perfil de produção endurecido
- pipelines de migração automatizada

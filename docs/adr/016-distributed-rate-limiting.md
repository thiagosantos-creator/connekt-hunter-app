# ADR 016: Distributed rate limiting

## Contexto
Rate limiting in-memory não protege cenários multi-instância.

## Decisão
Adotar chave distribuída em Redis para throttling por rota pública e IP, com configuração por endpoint (`@RateLimit`) e fallback local.

## Consequências
- Proteção consistente em múltiplas réplicas.
- Dependência opcional de Redis em staging/prod.
- Logs estruturados para eventos de bloqueio.

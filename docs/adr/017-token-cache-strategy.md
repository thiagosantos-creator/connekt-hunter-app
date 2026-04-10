# ADR 017: Public token cache strategy

## Contexto
Validação de token público gerava consulta ao banco em toda request.

## Decisão
Cachear validação de tokens em Redis usando hash SHA-256 da chave, TTL curto e invalidação em upgrade/revogação/expiração.

## Consequências
- Menor pressão no Postgres.
- Mantém fallback para DB quando cache indisponível.
- Segurança preservada com TTL curto e invalidação explícita.

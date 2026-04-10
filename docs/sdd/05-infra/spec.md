# SDD — Infra (Slice 09)

## Redis-backed controls
- Rate limiting distribuído para endpoints públicos via chave `ratelimit:v1:<scope>:<route>:<ip>`.
- Token cache público com hash SHA-256 (`public-token:v1:<token_hash>`), TTL curto (`PUBLIC_TOKEN_CACHE_TTL_SEC`, default 30s).
- Fallback local em memória preservado quando Redis estiver indisponível.

## Runtime components
- API NestJS (HTTP).
- Worker processando outbox real.
- Postgres (estado transacional).
- Redis (throttling + token cache).
- Storage/Email/AI gateways com fallback mock/local.

## Configuração por ambiente
- `REDIS_ENABLED` (`true` por padrão)
- `REDIS_URL`
- `RATE_LIMIT_WINDOW_SEC`
- `RATE_LIMIT_MAX_REQUESTS`
- `PUBLIC_TOKEN_CACHE_TTL_SEC`

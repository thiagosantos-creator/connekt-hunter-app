# SDD - Infra (Slice 09)

## Redis-backed controls
- Distributed rate limiting for public endpoints via `ratelimit:v1:<scope>:<route>:<ip>`.
- Public token cache with SHA-256 hash (`public-token:v1:<token_hash>`) and short TTL (`PUBLIC_TOKEN_CACHE_TTL_SEC`, default 30s).
- Local in-memory fallback remains available whenever Redis is unavailable.

## Runtime components
- NestJS API (HTTP)
- Worker processing outbox events
- Postgres (transactional state)
- Redis (throttling and token cache)
- Storage, email, auth, AI gateways with local/mock fallback
- Optional AWS test stack for real S3 + Cognito validation via CloudFormation

## Environment configuration
- `REDIS_ENABLED` (`true` by default)
- `REDIS_URL`
- `RATE_LIMIT_WINDOW_SEC`
- `RATE_LIMIT_MAX_REQUESTS`
- `PUBLIC_TOKEN_CACHE_TTL_SEC`

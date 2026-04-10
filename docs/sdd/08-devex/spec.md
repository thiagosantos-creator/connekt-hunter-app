# SDD — DevEx / Operação (Slice 09)

## Observabilidade mínima operacional
- Logs estruturados com `traceId`/`spanId`.
- Interceptor HTTP para correlação de requests.
- Worker com spans lógicos por evento processado.
- Eventos de segurança com contexto (throttling, cache hit/miss, token inválido/expirado).

## Estratégia de rollout
- Feature/config por ambiente para Redis e limites.
- Fallback automático para memória quando Redis indisponível.
- Sem remoção de mocks/fallbacks existentes.

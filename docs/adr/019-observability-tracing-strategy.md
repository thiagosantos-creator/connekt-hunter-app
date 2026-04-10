# ADR 019: Observability and tracing strategy

## Contexto
Observabilidade insuficiente para operação de staging/piloto.

## Decisão
Adicionar tracing mínimo com contexto de correlação (`traceId`/`spanId`) em API e worker, spans lógicos por fluxo crítico e logs estruturados.

## Consequências
- Diagnóstico ponta a ponta entre API/worker/gateways.
- Base pronta para integração completa com OpenTelemetry SDK/exporters em ambiente avançado.

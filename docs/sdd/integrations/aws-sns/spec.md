# Integração aws-sns

## Objetivo

Entrega de notificações e fan-out de eventos.

## Escopo inicial

- mapear credenciais e settings em `integrationConnections`
- registrar contratos operacionais em `integrations-hub`
- manter implementação real fora desta primeira fase

## Riscos e cuidados

- segregação por tenant
- rotação de credenciais
- auditoria de chamadas e falhas

# Integração aws-ses

## Objetivo

Envio de e-mails transacionais e operacionais.

## Escopo inicial

- mapear credenciais e settings em `integrationConnections`
- registrar contratos operacionais em `integrations-hub`
- manter implementação real fora desta primeira fase

## Riscos e cuidados

- segregação por tenant
- rotação de credenciais
- auditoria de chamadas e falhas

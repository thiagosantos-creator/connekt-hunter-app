# Estratégia de backend

## API HTTP

A API centraliza contratos síncronos, comandos iniciais e endpoints placeholder para todos os módulos de negócio definidos no escopo.

## Worker assíncrono

O worker isola processamento demorado, integrações, notificações e tarefas de mídia/IA.

## Convenções

- um módulo NestJS por domínio inicial
- controller placeholder quando houver superfície HTTP esperada
- service como ponto inicial de regras e orquestração
- DTOs e entities placeholders para facilitar evolução incremental

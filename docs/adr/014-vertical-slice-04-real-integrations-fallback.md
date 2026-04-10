# ADR 014 — Vertical Slice 04: integrações reais com fallback

## Status
Accepted — 2026-04-10

## Contexto
Precisamos habilitar providers reais (S3/SES/Cognito/IA/CV parser/Transcrição) sem quebrar o ambiente local com mocks.

## Decisão
- Introduzir `IntegrationsModule` global com config central + provider registry.
- Todas as integrações são habilitadas por feature flags `FF_*_REAL`.
- Fallback mock é padrão (`*_FALLBACK_TO_MOCK=true`).
- Persistir execução em `ProviderExecutionLog` e `AiExecutionLog`.
- Não permitir decisão automática final por IA; human review permanece obrigatório.

## Consequências
- Staging pode ativar providers reais por variável de ambiente.
- Local continua funcional com MinIO/Mailhog/dev-auth/mocks.
- Novo custo de operação: configuração de secrets por ambiente.

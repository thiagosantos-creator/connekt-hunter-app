# AGENTS — Connekt Hunter Monorepo

## Objetivo da área
Garantir evolução incremental dos vertical slices com estabilidade do ambiente local (dev auth, mocks de integrações, e2e básico).

## Limites de escopo
- Este arquivo cobre todo o repositório, exceto diretórios que possuam AGENTS.md próprio.
- Não implementar integrações externas reais sem feature flag + ADR.

## Convenções
- TypeScript ESM (`.js` nos imports locais compilados).
- Mudanças de API exigem atualização de README e contrato e2e em `tests/e2e`.
- Preferir abstrações provider-agnostic (auth, comms, storage).

## Definition of Done
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` sem erros.
- Fluxo do slice ativo preservado.
- Docs e ADRs atualizados quando houver decisão arquitetural.

## Comandos obrigatórios de validação
- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `docker compose -f docker-compose.dev.yml up -d`

## Regras para testes
- Todo módulo novo com teste unitário mínimo.
- Fluxos críticos com cobertura de contrato/e2e mínima.

## Regras para mudanças seguras
- Evitar breaking changes em endpoints existentes sem versionamento.
- Preservar fallback local (dev auth + mocks) quando adicionar camada real.

## Não pode ser feito sem atualizar spec/ADR
- Alterar estratégia de autenticação/identidade.
- Trocar provedor de storage.
- Mudar estratégia de processamento assíncrono.
- Acoplar domínio ao provider externo.

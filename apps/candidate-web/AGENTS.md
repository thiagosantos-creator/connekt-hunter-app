# AGENTS — apps/candidate-web

## Objetivo da área
Portal do candidato para fluxo guest por token e upgrade opcional de conta.

## Limites de escopo
- Sem acesso administrativo.
- Sem integração externa hardcoded de social login.

## Convenções
- Fluxo em etapas (basic/consent/resume/status).
- Mensagens de autenticação explícitas.

## Definition of Done
- Entrada por token funciona.
- Onboarding obrigatório completo.
- Upgrade guest -> conta disponível quando endpoint ativo.

## Comandos obrigatórios de validação
- `pnpm --filter candidate-web typecheck`
- `pnpm --filter candidate-web test`
- `pnpm --filter candidate-web build`

## Regras para testes
- Cobrir navegação de etapas e estados de erro.

## Regras para mudanças seguras
- Não remover fallback guest.

## Não pode ser feito sem atualizar spec/ADR
- Mudança no contrato de token/guest-session.
- Habilitar login social real por padrão.

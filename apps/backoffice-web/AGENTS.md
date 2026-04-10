# AGENTS — apps/backoffice-web

## Objetivo da área
Interface de backoffice para headhunter/client com rotas protegidas e sessão persistida.

## Limites de escopo
- Sem lógica de negócio crítica no frontend.
- Sem armazenamento de segredos.

## Convenções
- React + Vite + React Router.
- Controle de autenticação por contexto.
- Navegação sensível a permissões.

## Definition of Done
- Login/logout/session estáveis.
- Rotas protegidas funcionando.
- Estados de loading/erro claros.

## Comandos obrigatórios de validação
- `pnpm --filter backoffice-web typecheck`
- `pnpm --filter backoffice-web test`
- `pnpm --filter backoffice-web build`

## Regras para testes
- Testar estado auth e proteção de rota.

## Regras para mudanças seguras
- Não quebrar fluxo de login local.
- Mudanças de rota devem atualizar README.

## Não pode ser feito sem atualizar spec/ADR
- Mudança de estratégia de sessão/autenticação.

# AGENTS — apps/api

## Objetivo da área
Expor API multi-tenant do Connekt Hunter com auth, RBAC, onboarding e audit trail.

## Limites de escopo
- Não incluir lógica de UI.
- Não acoplar serviços de domínio diretamente a provider externo.

## Convenções
- NestJS modular monolith.
- Guards/decorators para auth e autorização.
- Prisma como camada de persistência.

## Definition of Done
- Endpoints compilam e possuem cobertura mínima.
- Healthcheck funcional.
- Contrato de rotas documentado no README.

## Comandos obrigatórios de validação
- `pnpm --filter api typecheck`
- `pnpm --filter api test`
- `pnpm --filter api build`

## Regras para testes
- Serviços críticos (auth, guards, onboarding) com unit test.
- Integração mínima para login/session/guest-upgrade.

## Regras para mudanças seguras
- Não remover `dev-login` sem alternativa compatível.
- Validar RBAC + tenancy antes de gravar entidades.

## Não pode ser feito sem atualizar spec/ADR
- Nova estratégia de auth/iam.
- Mudança de modelo de permissões.
- Introdução de integração real (social, MFA, IdP).

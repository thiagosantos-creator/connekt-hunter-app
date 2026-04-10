# AGENTS — packages/db

## Objetivo da área
Manter contrato de dados (schema Prisma, migrations, seed) para os slices.

## Limites de escopo
- Sem regras de negócio de aplicação.
- Apenas persistência e bootstrap de dados.

## Convenções
- Toda mudança em `schema.prisma` deve vir com migration correspondente.
- Seed deve manter dados mínimos de demo.

## Definition of Done
- Prisma schema válido.
- Migrations aplicáveis localmente.
- Seed funcional.

## Comandos obrigatórios de validação
- `pnpm --filter @connekt/db prisma:generate`
- `pnpm --filter @connekt/db prisma:migrate`
- `pnpm --filter @connekt/db prisma:seed`

## Regras para testes
- Testes de acesso básico ao client Prisma.

## Regras para mudanças seguras
- Não apagar colunas usadas pelos slices sem plano de migração.

## Não pode ser feito sem atualizar spec/ADR
- Mudança de estratégia de tenancy.
- Mudança de estratégia de audit/eventos/sessões.

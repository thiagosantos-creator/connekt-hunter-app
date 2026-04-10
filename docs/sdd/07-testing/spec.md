# SDD — Testing Strategy (Slice 08)

## Estrutura de Testes

### Unit Tests (apps/api)
Cada módulo com testes isolados usando mocks de Prisma e gateways:

| Módulo | Arquivo | Cobertura |
|--------|---------|-----------|
| shortlist | `shortlist.service.spec.ts` | tenant, audit, CRUD |
| evaluations | `evaluations.service.spec.ts` | tenant, audit, CRUD |
| client-decisions | `client-decisions.service.spec.ts` | tenant, audit, CRUD |
| smart-interview | `smart-interview.service.spec.ts` | template, session |
| workflow-automation | `workflow-automation.service.spec.ts` | tenant, state, audit |
| candidate-matching | `candidate-matching.service.spec.ts` | tenant, cross-tenant, audit |
| candidate-insights | `candidate-insights.service.spec.ts` | tenant, cross-tenant, audit |
| recommendation-engine | `recommendation-engine.service.spec.ts` | tenant, cross-tenant, audit |
| decision-engine | `decision-engine.service.spec.ts` | tenant, audit, priority |
| risk-analysis | `risk-analysis.service.spec.ts` | tenant, cross-tenant, audit |
| onboarding | `onboarding.service.spec.ts` | token validation, audit |
| candidates | `candidates.service.spec.ts` | invite, token |
| applications | `applications.service.spec.ts` | create |
| vacancies | `vacancies.service.spec.ts` | create, list |
| auth/rbac | `permissions.spec.ts` | role permissions |
| integrations | `provider-registry.service.spec.ts` | fallback |
| candidate-ranking | `candidate-ranking.service.spec.ts` | ranking |

### Contract/E2E Tests (tests/e2e)
Testes de contrato que validam políticas arquiteturais:

| Suite | Arquivo | Escopo |
|-------|---------|--------|
| Slice 05 | `vertical-slice-05.test.ts` | AI assistive |
| Slice 06 | `vertical-slice-06.test.ts` | Automation |
| Slice 07 | `vertical-slice-07.test.ts` | Hardening |
| Slice 08 | `vertical-slice-08.test.ts` | Tenant isolation, rate limiting, worker defensive, e2e flows |

### Audit Verification Tests (apps/api/test)
Testes de verificação automatizada que leem código-fonte para confirmar presença de:
- `auditEvent.create()` em endpoints críticos
- `assertTenantAccess` em módulos de inteligência
- `assertWorkerTenantConsistency` no worker
- Rate limiting e token validation nos guards

## Comandos
```bash
pnpm test          # Roda todos os testes via Turbo
pnpm lint          # Linting
pnpm typecheck     # TypeScript check
pnpm build         # Build completo
```

## Padrão de Teste
- Vitest como test runner
- `vi.mock('@connekt/db')` para isolar Prisma
- Mock de gateways (AI, Storage, Email, etc.) injetados via constructor
- Assertions: `toThrow`, `toHaveBeenCalledWith`, `objectContaining`

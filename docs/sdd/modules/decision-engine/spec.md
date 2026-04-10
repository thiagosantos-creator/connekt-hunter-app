# Decision Engine — Vertical Slice 06

## Objetivo
Calcular priorização dinâmica de candidatos por vaga usando sinais de matching, risco e recomendações, sem decisão autônoma da IA.

## Regras
- IA assistiva apenas.
- Override humano sempre permitido.
- Auditoria obrigatória (`decision.priority-calculated`).

## Tenant Isolation (Slice 08)
- Validação de existência da vacancy antes do cálculo.
- Actor membership validation via `assertTenantAccess()`.
- Rejeição com `ForbiddenException` para atores fora da organização.

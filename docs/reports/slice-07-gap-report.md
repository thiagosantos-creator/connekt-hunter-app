# Slice 07 — Gap Analysis, Validação Global e Hardening

Data da avaliação: 2026-04-10.
Escopo analisado: Slices 01–06 em `docs/sdd/*`, `docs/sdd/modules/*`, `docs/sdd/integrations/*` e implementação em `apps/api`, `apps/worker`, `apps/backoffice-web`, `apps/candidate-web`, `tests/e2e`.

## Metodologia
1. Leitura dos contratos de fluxo e módulos (SDD e integrações).
2. Verificação de implementação de serviços críticos e guards.
3. Execução da suíte de validação (`lint`, `typecheck`, `test`, `build`).
4. Classificação de gaps por severidade: crítico, alto, médio, baixo.

## Gap report

### Crítico
- **Nenhum gap crítico aberto após correções do Slice 07.**

### Alto
1. **Risco de boundary violation no workflow automation**
   - Situação: `workflow-automation/suggest` e `execute` permitiam operar sem validar consistência tenant (`candidate` x `vacancy`) e sem checar `membership` do ator em todos os caminhos.
   - Impacto: potencial execução cross-tenant e auditoria inconsistente.
   - Status: **corrigido** com validação de tenant, membership e estado de sugestão `pending`.

2. **Sessões smart interview aceitavam respostas em estados inválidos**
   - Situação: upload/complete não bloqueavam `session.status` diferente de `in_progress`.
   - Impacto: dados inválidos e quebra de fluxo (respostas após submit/review).
   - Status: **corrigido** com validações de estado e erros explícitos.

3. **Transcription enqueue usando tenant incorreto**
   - Situação: `tenantId` era preenchido com `candidateId` em vez de `organizationId`.
   - Impacto: rastreabilidade e isolamento de integração comprometidos.
   - Status: **corrigido** para usar `vacancy.organizationId`.

### Médio
1. **Inconsistência de observabilidade em seleção de provider**
   - Situação: ausência de log estruturado ao resolver provider/fallback.
   - Status: **corrigido** com log estruturado por integração.

2. **Estados inválidos de review humano**
   - Situação: review podia ocorrer sem sessão submetida e sem notas obrigatórias.
   - Status: **corrigido** com validação de pré-condição e notes obrigatórias.

### Baixo
1. **Cobertura de contrato Slice 07 inexistente**
   - Situação: não havia teste e2e de contrato dedicado ao hardening.
   - Status: **corrigido** com `tests/e2e/vertical-slice-07.test.ts`.

## Fluxos validados
1. **Recrutamento ponta a ponta (Slice 01 + 02 + 03)**: contratos e testes existentes executados com sucesso.
2. **Inteligência (Slice 05)**: contratos de assistive-only, explicabilidade e tópicos assíncronos executados.
3. **Automação/recomendação (Slice 06)**: contratos e hardening de execução assistida com aprovação humana.
4. **Integrações reais com fallback (Slice 04)**: validação de seleção de provider + fallback mock e logs de resolução.

## Correções aplicadas (resumo)
- Hardening em Smart Interview (validação de estado, pergunta válida por template, tenant correto na transcrição, revisão humana pós-submit).
- Hardening em Workflow Automation (tenant boundary, membership do ator, execução apenas em `pending`).
- Observabilidade de integração (logs estruturados no provider registry).
- Novos testes unitários e contrato e2e do Slice 07.

## Riscos residuais
1. Contratos e2e atuais ainda são majoritariamente declarativos e não exercitam API real com banco/infra.
2. Não há verificação automatizada de trilhas completas de auditoria por endpoint crítico.
3. `docker compose` não foi executado neste ambiente por ausência do binário `docker`.

## Maturidade da plataforma (Slice 07)
- **Nível estimado: M3 (estável em desenvolvimento, governança parcial).**
- Evidências: gates de CI locais passando, hardening de estados críticos e tenant boundary, documentação atualizada.
- Lacunas para M4: e2e real com ambiente integrado e observabilidade/auditoria validada automaticamente.

## Próximo passo recomendado
1. Subir suíte de **e2e integrada** (API + DB + worker + providers mockados) para validar fluxos reais e auditoria de ponta a ponta.
2. Adicionar testes de integração para guards RBAC + tenancy por endpoint crítico.
3. Criar checklist automatizado de fallback por integração no healthcheck.

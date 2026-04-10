# Slice 07 — Gap Analysis, Validação Global e Hardening

Data da avaliação: 2026-04-10.
Escopo analisado: Slices 01–06 em `docs/sdd/*`, `docs/sdd/modules/*`, `docs/sdd/integrations/*` e implementação em `apps/api`, `apps/worker`, `apps/backoffice-web`, `apps/candidate-web`, `tests/e2e`.

## Metodologia
1. Leitura dos contratos de fluxo e módulos (SDD e integrações).
2. Verificação de implementação de serviços críticos e guards.
3. Verificação de tenant isolation em camada de serviço.
4. Análise de trilha de auditoria por endpoint sensível.
5. Revisão de resiliência do worker.
6. Execução da suíte de validação (`lint`, `typecheck`, `test`, `build`).
7. Classificação de gaps por severidade: crítico, alto, médio, baixo.

## Gap report

### Crítico
- **Nenhum gap crítico aberto após correções do Slice 07.**

### Alto — Corrigidos nesta iteração

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

4. **Shortlist service sem tenant isolation nem auditoria**
   - Situação: `addToShortlist()` usava `findUniqueOrThrow` sem verificar membership do ator e sem criar `auditEvent`.
   - Impacto: qualquer usuário autenticado com permissão poderia shortlistar candidato de outro tenant.
   - Status: **corrigido** com validação de membership, NotFoundException explícito e audit logging.

5. **Evaluations service sem tenant isolation nem auditoria**
   - Situação: `create()` criava avaliação diretamente sem verificar se o avaliador pertence à organização da vaga.
   - Impacto: avaliador de Org A poderia avaliar candidatos de Org B.
   - Status: **corrigido** com validação de membership e audit logging.

6. **Client-decisions service sem tenant isolation e auditoria incompleta**
   - Situação: `create()` não verificava ownership do shortlistItem e o auditEvent não incluía `actorId`.
   - Impacto: decisões cross-tenant possíveis; trilha de auditoria sem rastreabilidade do ator.
   - Status: **corrigido** com validação de membership, NotFoundException e actorId no auditEvent.

7. **Onboarding service sem tratamento de erro e sem auditoria**
   - Situação: `findUniqueOrThrow` lançava exceção genérica sem HTTP status adequado; nenhuma operação de onboarding era auditada.
   - Impacto: erro 500 em vez de 404 para token inválido; compliance LGPD comprometido sem trilha.
   - Status: **corrigido** com `findUnique` + `NotFoundException`, audit events por etapa e logs estruturados.

8. **Worker sem isolamento de erro por evento**
   - Situação: falha em um único evento interrompia o processamento de todos os eventos restantes do batch.
   - Impacto: um evento corrompido bloqueava pipeline inteiro; sem log de contexto do evento.
   - Status: **corrigido** com `safeProcess()` wrapper que isola erros por evento com logging contextualizado.

### Médio — Corrigidos
1. **Inconsistência de observabilidade em seleção de provider**
   - Situação: ausência de log estruturado ao resolver provider/fallback.
   - Status: **corrigido** com log estruturado por integração.

2. **Estados inválidos de review humano**
   - Situação: review podia ocorrer sem sessão submetida e sem notas obrigatórias.
   - Status: **corrigido** com validação de pré-condição e notes obrigatórias.

### Baixo — Corrigidos
1. **Cobertura de contrato Slice 07 inexistente**
   - Situação: não havia teste e2e de contrato dedicado ao hardening.
   - Status: **corrigido** com `tests/e2e/vertical-slice-07.test.ts`.

## Gaps residuais (não corrigidos — escopo futuro)

### Alto
1. **Service-level tenant isolation em módulos de inteligência**: `candidate-matching`, `candidate-insights`, `recommendation-engine`, `decision-engine` e `risk-analysis` não validam ownership do candidato/vaga na camada de serviço. Mitigado parcialmente pelos guards nos controllers, mas serviços expostos a worker/internal calls permanecem sem proteção.
2. **Candidate-facing endpoints sem autenticação**: `/candidate/token/:token`, smart interview endpoints (`presign`, `complete`, `submit`, `candidate/session/:publicToken`) e onboarding endpoints são públicos. Isso é by-design para o fluxo de token/magic-link, mas não há rate-limiting ou validação de expiração de token em todos os casos.
3. **Worker sem tenant boundary validation**: worker processa eventos do outbox sem verificar contexto de tenant. Defense-in-depth recomendado.

### Médio
1. **Ausência de testes unitários** para `candidate-matching`, `candidate-insights`, `recommendation-engine`, `decision-engine`, `risk-analysis` e `onboarding` services.
2. **Frontend sem validação de token expirado** no carregamento inicial (localStorage).
3. **PermissionsGuard retorna true se nenhuma permissão é requerida** — endpoints sem `@RequirePermissions` passam automaticamente pelo guard.

### Baixo
1. **Contratos e2e declarativos** — não exercitam API real com banco/infra.
2. **Worker executa em single-run** — sem loop de polling ou scheduler para processamento contínuo.

## Fluxos validados
1. **Recrutamento ponta a ponta (Slice 01 + 02 + 03)**: contratos e testes existentes executados com sucesso; shortlist/evaluation/decision agora com tenant isolation e auditoria.
2. **Inteligência (Slice 05)**: contratos de assistive-only, explicabilidade e tópicos assíncronos executados.
3. **Automação/recomendação (Slice 06)**: contratos e hardening de execução assistida com aprovação humana.
4. **Integrações reais com fallback (Slice 04)**: validação de seleção de provider + fallback mock e logs de resolução.

## Correções aplicadas (resumo)
- Hardening em Smart Interview (validação de estado, pergunta válida por template, tenant correto na transcrição, revisão humana pós-submit).
- Hardening em Workflow Automation (tenant boundary, membership do ator, execução apenas em `pending`).
- Hardening em Shortlist (tenant validation, NotFoundException, audit logging).
- Hardening em Evaluations (tenant validation, audit logging).
- Hardening em Client Decisions (tenant validation, actorId no audit, NotFoundException).
- Hardening em Onboarding (NotFoundException, audit events, structured logging).
- Hardening em Worker (per-event error isolation, contextual error logging).
- Observabilidade de integração (logs estruturados no provider registry).
- Novos testes unitários para shortlist, evaluations, client-decisions, workflow-automation, provider-registry.
- Contrato e2e expandido do Slice 07.

## Riscos residuais
1. Contratos e2e atuais ainda são majoritariamente declarativos e não exercitam API real com banco/infra.
2. Módulos de inteligência (matching, insights, ranking, recommendation, risk, decision) sem tenant isolation na camada de serviço.
3. Não há verificação automatizada de trilhas completas de auditoria por endpoint crítico.
4. `docker compose` não foi executado neste ambiente por ausência do binário `docker`.

## Maturidade da plataforma (Slice 07)
- **Nível estimado: M3+ (estável em desenvolvimento, governança parcial, hardening avançado em serviços core).**
- Evidências: gates de CI locais passando, hardening de estados críticos e tenant boundary em todos os serviços core do recrutamento, documentação atualizada, worker resiliente.
- Lacunas para M4: e2e real com ambiente integrado, tenant isolation em serviços de inteligência, observabilidade/auditoria validada automaticamente.

## Próximo passo recomendado
1. Subir suíte de **e2e integrada** (API + DB + worker + providers mockados) para validar fluxos reais e auditoria de ponta a ponta.
2. Adicionar testes de integração para guards RBAC + tenancy por endpoint crítico.
3. Estender tenant isolation para serviços de inteligência (`candidate-matching`, `candidate-insights`, `recommendation-engine`, `decision-engine`, `risk-analysis`).
4. Implementar rate-limiting nos endpoints públicos de candidato.
5. Criar checklist automatizado de fallback por integração no healthcheck.

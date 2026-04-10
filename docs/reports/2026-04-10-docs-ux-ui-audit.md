# Auditoria de Documentação + UX/UI — 2026-04-10

## Objetivo
Verificar se ADR/SDD/README estão atualizados e coerentes com os módulos/serviços/dependências atuais, além de listar pendências de UX/UI.

## Resultado executivo
- **Status geral da documentação:** ✅ Coerente com os slices ativos, com atualização aplicada no índice SDD.
- **Status de dependências e impactos:** ✅ Mapeados (API, Worker, Backoffice, Candidate Portal, integrações com feature flag).
- **Status de UX/UI:** ⚠️ Sem bloqueadores críticos identificados, porém com pendências de melhoria.

## Checklist de coerência (docs)

### ADR
- Encontrados ADRs `001` até `019` sem lacunas na sequência.
- Temas principais cobertos: auth, provider-agnostic, segurança defensiva, rate limiting distribuído, cache de token e observabilidade.

### SDD
- SDDs base presentes (`001`, `002`, `003`, `004`, `007`).
- SDDs transversais presentes (`05-infra`, `06-security`, `07-testing`, `08-devex`).
- SDDs de módulos e integrações presentes em `docs/sdd/modules/*` e `docs/sdd/integrations/*`.

### README
- Gate de validação e stack seguem documentados.
- Endpoints e rotas principais dos apps estão documentados.
- Seção de estado documental adicionada para facilitar rastreabilidade.

## Visão de dependências e módulos/serviços afetados

### API (`apps/api`)
- Dependência direta de `@connekt/db`.
- Responsável por auth/RBAC/tenant access, onboarding, smart interview e módulos de inteligência.
- Integrações externas sempre via gateway e controladas por feature flags.

### Worker (`apps/worker`)
- Consome outbox e executa tarefas assíncronas dos módulos de inteligência.
- Aplica validação defensiva de tenancy em processamento de eventos.

### Frontends (`apps/backoffice-web`, `apps/candidate-web`)
- Backoffice com rotas protegidas por permissão/role.
- Candidate portal guiado por token público e fluxo por etapas.

### Pacotes compartilhados (`packages/db`, `packages/ui`)
- `@connekt/db`: schema + client Prisma para API/worker.
- `@connekt/ui`: tokens/estilos reutilizados pelos frontends.

## Pendências UX/UI identificadas

### Média
1. **Ausência de estratégia centralizada de Error Boundary no frontend**
   - Impacto: falhas não tratadas podem derrubar subtree de tela.
   - Sugestão: adicionar boundary por app + fallback visual padrão.

2. **Estados de carregamento/erro ainda heterogêneos entre telas**
   - Impacto: inconsistência de UX, maior esforço cognitivo do usuário.
   - Sugestão: padronizar componentes `loading/error/empty` em `@connekt/ui`.

### Baixa
3. **Navegação sem trilha de contexto (breadcrumbs) em áreas administrativas**
   - Impacto: usabilidade menor em fluxos longos (ex.: auditoria/admin users).
   - Sugestão: breadcrumbs simples nas rotas de backoffice.

4. **Cobertura automatizada de UX visual inexistente (snapshot/visual regression)**
   - Impacto: regressões visuais podem passar despercebidas.
   - Sugestão: adicionar smoke visual incremental para telas críticas.

## Observações
- Não foi possível gerar printscreen neste ambiente (ferramenta de browser/screenshot indisponível).
- Recomenda-se executar validação manual local para UX com capturas das telas: `/account`, `/admin/users`, `/audit`, `/onboarding/*`, `/interview`.

# SDD-003 — Recruitment Flow End-to-End

## Objetivo
Definir o comportamento esperado do fluxo operacional de recrutamento.

## Sequência funcional
1. Headhunter autentica no sistema.
2. Headhunter cria uma vacancy.
3. Sistema envia convite para candidato.
4. Candidato acessa onboarding por token.
5. Candidato conclui dados básicos, consentimento e currículo.
6. Worker processa tarefas pendentes.
7. Backoffice lista applications.
8. Headhunter executa shortlist e avaliação.
9. Cliente registra decisão final (`approve`, `reject`, `interview`, `hold`).

## Endpoints associados
- `POST /vacancies`
- `GET /vacancies`
- `POST /candidates/invite`
- `GET /candidate/token/:token`
- `POST /candidate/onboarding/basic`
- `POST /candidate/onboarding/consent`
- `POST /candidate/onboarding/resume`
- `GET /applications`
- `POST /shortlist`
- `POST /evaluations`
- `POST /client-decisions`

## Observabilidade mínima
- Registrar eventos de auditoria para operações críticas.
- Garantir rastreabilidade de mensagens/dispatches assíncronos.

## Critérios de aceitação
- Fluxo manual smoke deve ser executável com ambiente local.
- Alterações no fluxo exigem atualização desta SDD + contratos de teste críticos.

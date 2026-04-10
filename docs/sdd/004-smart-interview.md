# SDD-004 — Smart Interview (Vertical Slice 03)

## Objetivo
Definir o fluxo de entrevista estruturada por vídeo com geração de perguntas IA mock, respostas assíncronas e revisão humano + IA.

## Fluxo funcional
1. Backoffice configura template por vaga.
2. Sistema gera perguntas mock por IA e permite edição manual.
3. Headhunter cria sessão por aplicação.
4. Candidato acessa sessão por token público e envia respostas em vídeo (presigned URL mock).
5. Worker processa vídeo, transcreve (mock) e roda análise IA (mock).
6. Sessão entra em estado `awaiting_human_review`.
7. Headhunter/client registram review humano auditável.

## Estados
- Sessão: `draft` → `in_progress` → `submitted` → `awaiting_human_review` → `reviewed`
- Resposta: `uploaded` → `transcribed` → `analyzed`

## Endpoints
### Backoffice (auth + RBAC)
- `POST /smart-interview/templates`
- `GET /smart-interview/templates?vacancyId=`
- `POST /smart-interview/templates/:templateId/generate-questions`
- `PUT /smart-interview/templates/:templateId/questions`
- `POST /smart-interview/sessions`
- `GET /smart-interview/sessions/:sessionId/review`
- `POST /smart-interview/sessions/:sessionId/human-review`

### Candidate (token sessão)
- `GET /smart-interview/candidate/session/:publicToken`
- `POST /smart-interview/sessions/:sessionId/answers/presign`
- `POST /smart-interview/sessions/:sessionId/answers/complete`
- `POST /smart-interview/sessions/:sessionId/submit`

## Assíncrono (worker)
- `smart-interview.video-uploaded`
- `smart-interview.transcribed`

## Restrições
- Sem integração Zoom.
- Sem LLM real.
- Sem scoring final automático.

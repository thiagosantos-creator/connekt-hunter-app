# Module Spec — Candidate Onboarding (Slice 04)

- Etapa resume agora registra asset metadata e parse metadata.
- Fluxo local preservado com providers mock.
- Eventos continuam publicados no outbox.

## Endpoint Hardening (Slice 08)
- Endpoints `/candidate/onboarding/*` agora protegidos com `RateLimitGuard` (20 req/min por IP, configurável via `@RateLimit`).
- Token de candidato validado via `NotFoundException` caso não exista no banco.
- Cada etapa (basic, consent, resume) registra `auditEvent` com `candidateId` e `organizationId`.
- Testes unitários adicionados para validar token inválido e audit trail.


## Slice 09 update
- Endpoints públicos de onboarding protegidos por `RateLimitGuard` distribuído + `PublicTokenGuard` com cache de token.

## Slice 11 update — Preferências profissionais e vídeo de apresentação (ADR-022)

### Fluxo de onboarding expandido (5 etapas visíveis ao candidato)

| Step | Rota | Descrição |
|------|------|-----------|
| 1 | `/onboarding/basic` | Dados básicos (nome, telefone) |
| 2 | `/onboarding/consent` | Consentimento LGPD e Termos |
| 3 | `/onboarding/resume` | Upload de currículo (PDF/DOC/DOCX) |
| 4 | `/onboarding/preferences` | **NOVO** — Preferências profissionais (salário, cargos, idiomas) |
| 5 | `/onboarding/intro-video` | **NOVO** — Vídeo de apresentação (2–3 min, vinculado ao perfil) |

A etapa `/onboarding/media-check` (verificação de câmera/microfone) continua disponível como preparação para entrevistas técnicas, mas não faz parte do indicador de onboarding.

### Novos endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/candidate/onboarding/preferences` | Salva preferências profissionais |
| POST | `/candidate/onboarding/intro-video/presign` | Cria presigned URL para upload do vídeo de apresentação |
| POST | `/candidate/onboarding/intro-video/complete` | Marca vídeo como concluído e atualiza `CandidateProfile` |

### Modelos de banco de dados

- **`CandidateProfile`** — novos campos: `introVideoKey`, `introVideoProvider`, `introVideoDurationSec`, `introVideoUploadedAt`
- **`CandidateOnboardingSession`** — novos campos: `preferencesCompleted`, `introVideoCompleted`
- **`CandidatePreferences`** — novo modelo: `salaryMin`, `salaryMax`, `jobTitles String[]`, `languages String[]`

### Ocultação de etapas internas no portal do candidato

O método `getStatus()` retorna apenas as 5 etapas do onboarding do candidato. As etapas internas `review`, `shortlisted` e `decision` foram removidas do array `steps` para não expor o processo interno de seleção. O resultado da decisão final continua acessível no campo `decision` separado.

### Auditoria

Cada nova etapa registra `auditEvent`:
- `onboarding.preferences_completed`
- `onboarding.intro_video_completed`

### Vídeo vinculado ao perfil (não à vaga)

O vídeo de apresentação é armazenado em `CandidateProfile.introVideoKey` (namespace storage: `candidate-intro-video/{candidateId}`), podendo ser reutilizado em múltiplas candidaturas. Ver ADR-022 para detalhes de decisão arquitetural.


# ADR-022 — Vídeo de Apresentação do Candidato Vinculado ao Perfil

**Status:** Accepted  
**Date:** 2026-04-15  
**Deciders:** @thiagosantos-creator

---

## Contexto

O sistema precisava de um mecanismo para que candidatos pudessem se apresentar de forma rica, além do currículo textual. O requisito era permitir que um vídeo de apresentação (2–3 minutos) fosse gravado e associado ao **perfil do candidato**, não a uma candidatura específica — de forma que o mesmo vídeo possa ser utilizado em múltiplas vagas.

Ao mesmo tempo, o portal do candidato estava expondo etapas internas do processo de seleção (shortlist, triagem, decisão) na visão de status, o que é inadequado pois revela processos internos de headhunting ao candidato.

---

## Decisão

### 1. Vídeo de apresentação vinculado ao `CandidateProfile`

O vídeo de apresentação (`introVideoKey`, `introVideoProvider`, `introVideoDurationSec`, `introVideoUploadedAt`) é armazenado diretamente no modelo `CandidateProfile`, tornando-o reutilizável entre candidaturas.

O upload é feito via presigned URL no storage (namespace `candidate-intro-video/{candidateId}`), seguindo o mesmo padrão de `candidate-cv/{candidateId}` já estabelecido para currículos.

### 2. Preferências profissionais em modelo separado

As preferências (`salaryMin`, `salaryMax`, `jobTitles`, `languages`) ficam em `CandidatePreferences` (1:1 com `Candidate`), separadas do perfil por extensibilidade futura.

### 3. Ocultar etapas internas no portal do candidato

O método `getStatus()` do `OnboardingService` passou a retornar apenas etapas do próprio onboarding (basic, consent, resume, preferences, intro-video). As etapas internas `review`, `shortlisted` e `decision` foram removidas do array `steps`. O resultado da decisão final (`approve`, `reject`, etc.) continua disponível no campo `decision` separado e é exibido como badge no hero card — sem revelar os estágios internos que levaram a essa decisão.

### 4. Fluxo de onboarding expandido (5 etapas visíveis)

```
Dados Básicos → LGPD / Termos → Upload CV → Preferências → Vídeo Intro
```

A etapa de verificação de câmera/microfone (`/onboarding/media-check`) permanece como preparação para entrevistas técnicas, não fazendo mais parte do indicador de onboarding.

---

## Consequências

### Positivas
- O candidato não é exposto a informações do processo interno de triagem (compliance e UX).
- O vídeo de apresentação é um ativo reutilizável, reduzindo fricção para candidaturas futuras.
- As preferências enriquecem o matching automatizado (matching engine pode usar `jobTitles` e `salaryMin/Max` nos critérios).
- O onboarding é mais completo e semelhante a plataformas como Simera, aumentando a qualidade dos dados coletados.

### Negativas / Trade-offs
- O candidato não tem visibilidade em tempo real de onde está na fila de seleção (intencional — requisito do produto).
- Upload de vídeo via browser é dependente de suporte a `MediaRecorder` API (WebM/VP9). Navegadores legados não são suportados.
- Vídeo não passa por compressão no cliente; tamanhos grandes podem impactar a experiência em conexões lentas.

---

## Alternativas consideradas

| Alternativa | Razão da rejeição |
|---|---|
| Vídeo vinculado à candidatura (não ao perfil) | Aumentaria fricção — candidato precisaria regravar para cada vaga |
| Mostrar etapas internas com labels genéricas ("Em análise") | Ainda poderia confundir; melhor não mostrar etapas que o candidato não controla |
| Upload de vídeo pré-processado no servidor antes de presign | Adiciona latência desnecessária; presign direto ao S3/MinIO é suficiente |

---

## Modelos afetados

- `CandidateProfile` — campos `introVideoKey`, `introVideoProvider`, `introVideoDurationSec`, `introVideoUploadedAt`
- `CandidateOnboardingSession` — campos `preferencesCompleted`, `introVideoCompleted`
- `CandidatePreferences` — novo modelo (`salaryMin`, `salaryMax`, `jobTitles`, `languages`)

## Endpoints adicionados

- `POST /candidate/onboarding/preferences`
- `POST /candidate/onboarding/intro-video/presign`
- `POST /candidate/onboarding/intro-video/complete`

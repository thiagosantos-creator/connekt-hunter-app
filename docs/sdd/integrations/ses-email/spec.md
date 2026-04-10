# SES Email Integration Spec

- Provider principal: Amazon SES (`FF_EMAIL_REAL=true`).
- Fallback local: Mailhog/mock.
- Templates versionados: `templateKey` + `templateVersion` no dispatch.
- Correlação por `messageDispatch.id` + `correlationId`.
- Eventos persistidos em `MessageEvent`.

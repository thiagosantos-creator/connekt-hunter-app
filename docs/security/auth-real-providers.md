# Auth & Security - Real Providers

- Cognito can be enabled with `FF_AUTH_REAL` and `COGNITO_*` env vars.
- Local sessions still persist in `UserSession` with provider metadata.
- MFA and social login hooks remain structured without breaking `dev-auth`.
- For real AWS tests, use separate pools for workforce and candidate users.
- Cognito app clients may be confidential, using:
  - `COGNITO_CLIENT_SECRET`
  - `COGNITO_CANDIDATE_CLIENT_SECRET`
- Client secrets must stay only in backend/runtime configuration and must never be exposed to the frontend.

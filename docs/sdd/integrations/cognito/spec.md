# Cognito Integration Spec

- Provider principal: `aws-cognito` com `FF_AUTH_REAL=true`.
- Fallback local: `dev-auth`.
- Persistência de identidade em `AuthIdentity`.
- Social login preparado para Google/LinkedIn via `SocialIdentityLink`.
- Hook de MFA preparado em metadata de sessão.

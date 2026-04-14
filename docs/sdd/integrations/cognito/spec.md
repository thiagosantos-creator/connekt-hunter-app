# Cognito Integration Spec

- Primary provider: `aws-cognito` with `FF_AUTH_REAL=true`.
- Local fallback: `dev-auth`.
- Identity persistence stays in `AuthIdentity`.
- Social login remains provider-agnostic via `SocialIdentityLink`.
- MFA hooks stay attached to session metadata.
- Two user pools are expected:
  - workforce: `admin`, `headhunter`, `client`
  - candidate: candidate portal and onboarding
- Cognito app clients may run with `GenerateSecret=true`.
- Supported env vars for confidential clients:
  - `COGNITO_CLIENT_SECRET`
  - `COGNITO_CANDIDATE_CLIENT_SECRET`
- Client secrets are reserved for backend-side code exchange and must not be exposed to frontend code.
- AWS test-stack baseline lives at `infra/aws/cloudformation/connekt-test-stack.yaml`.

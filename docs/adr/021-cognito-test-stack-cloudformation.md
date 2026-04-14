# ADR 021 — Cognito Test Stack via CloudFormation

## Status

Accepted

## Context

Para validar o fluxo E2E real do Connekt Hunter em ambiente AWS, precisamos padronizar a infraestrutura minima de teste sem depender de criacao manual em console:

1. bucket S3 para assets e uploads
2. user pool Cognito para workforce (`admin`, `headhunter`, `client`)
3. user pool Cognito separado para `candidate`
4. app clients Cognito com `client secret`
5. dominios Hosted UI consistentes para local/staging

O repositorio ja estava real-ready para providers AWS/OpenAI por feature flag, mas faltava uma forma reprodutivel de levantar a stack de teste.

## Decision

1. Adotar CloudFormation como baseline de provisionamento para ambiente de teste AWS.
2. Provisionar dois user pools Cognito separados:
   - workforce
   - candidate
3. Criar app clients confidenciais (`GenerateSecret=true`) para ambos os pools.
4. Manter o `client secret` apenas no backend/ambiente, nunca exposto para frontend.
5. Fornecer script auxiliar para exportar outputs da stack e recuperar `client secret` via AWS CLI.
6. Criar a stack base com MFA TOTP (`MfaConfiguration: OPTIONAL` + `EnabledMfas: [SOFTWARE_TOKEN_MFA]`) para suportar aplicativos autenticadores sem dependencia de SMS/SNS.

## Consequences

### Positive
- provisionamento repetivel para testes E2E reais
- separacao clara entre identidade interna e candidato
- suporte a secret no backend para futuro fluxo de callback/token exchange
- configuracao alinhada a ambientes staging/producao
- MFA alinhado ao requisito de QR code/app autenticador para testes E2E

### Negative
- deploy da stack passa a depender de AWS CLI/credenciais
- `client secret` nao sai automaticamente nos outputs do CloudFormation
- ainda e necessario completar o fluxo Cognito real no backend para token exchange/JWKS
- ainda e necessario concluir a UX/backend de setup TOTP no fluxo Cognito real

### Follow-up
- implementar callback backend para `authorization code` do Cognito
- trocar storage mockado por presigned URL S3 real
- ligar parse de CV real com upload/conteudo efetivo do curriculo

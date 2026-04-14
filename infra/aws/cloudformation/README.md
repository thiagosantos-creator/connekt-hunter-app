# AWS Test Stack

CloudFormation base para testes E2E reais do Connekt Hunter na AWS.

## O que a stack cria
- 1 bucket S3 para assets, curriculos e midia de entrevista
- 1 Cognito User Pool workforce para admin, headhunter e client
- 1 Cognito User Pool candidate para candidatos
- 2 app clients Cognito com `GenerateSecret=true`
- 2 dominios Hosted UI do Cognito
- grupos `admin`, `headhunter` e `client` no pool workforce

## Deploy
Exemplo com AWS CLI:

```bash
aws cloudformation deploy \
  --stack-name connekt-hunter-staging \
  --template-file infra/aws/cloudformation/connekt-test-stack.yaml \
  --parameter-overrides file://infra/aws/cloudformation/parameters.example.json \
  --capabilities CAPABILITY_NAMED_IAM
```

## Exportar env local
Depois do deploy, gere um arquivo `.env` base com:

```powershell
pwsh ./infra/aws/cloudformation/export-connekt-env.ps1 `
  -StackName connekt-hunter-staging `
  -Region us-east-1 `
  -OutputPath .env.aws.generated
```

## Observacoes
- O template cria clients confidenciais; o `client secret` nao e exposto no frontend.
- O baseline da stack habilita MFA por aplicativo autenticador com `SOFTWARE_TOKEN_MFA`.
- Isso cobre QR code/TOTP para apps como Google Authenticator, Authy e similares, sem depender de SMS/SNS.
- Os prefixos de dominio do Cognito precisam ser validos e unicos. O template agora anexa o `AWS::AccountId` automaticamente para reduzir colisao, por exemplo `connekt-stg-candidate-123456789012`.
- Evite usar termos reservados como `aws`, `amazon` e `cognito` no valor base de `WorkforceDomainPrefix` e `CandidateDomainPrefix`.
- O helper usa `aws cognito-idp describe-user-pool-client` para buscar os secrets e preencher o `.env`.
- Ainda e necessario informar manualmente `OPENAI_API_KEY`, `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`.
- O fluxo Cognito real do backend precisa existir para troca de `code -> token`; esta stack prepara a infraestrutura para essa fase.

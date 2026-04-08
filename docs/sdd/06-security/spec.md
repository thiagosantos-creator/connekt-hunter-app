# Diretrizes de segurança

## Identidade e acesso

- autenticação centralizada em `auth-iam`
- autorização por papéis em `rbac-tenancy`
- isolamento de tenant por organização e membership

## Dados sensíveis

- arquivos e mídia devem ficar em storage dedicado
- credenciais de integração ficam em `integrationConnections`
- consentimentos LGPD possuem registro explícito e auditável

## Segurança operacional

- CI com permissões mínimas
- ambiente local com variáveis versionadas apenas em arquivos exemplo
- trilha de auditoria obrigatória para ações administrativas críticas

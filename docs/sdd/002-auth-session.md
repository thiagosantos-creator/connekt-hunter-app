# SDD-002 — Auth, Session and Authorization

## Objetivo
Descrever o comportamento funcional da autenticação e autorização para os slices atuais.

## Fluxos suportados
1. Login e logout de usuário.
2. Sessão autenticada com persistência de contexto.
3. Identificação do usuário atual.
4. Upgrade de sessão convidado para conta autenticada.

## Requisitos de comportamento
- O sistema deve suportar estratégia de auth provider-agnostic.
- Permissões (RBAC) devem ser validadas por rota/caso de uso.
- Operações sensíveis devem ser tenant-aware quando aplicável.
- Fluxo local de dev auth deve continuar disponível para desenvolvimento.

## Endpoints associados
- `POST /auth/login`
- `POST /auth/dev-login`
- `GET /auth/session`
- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/guest-upgrade`

## Rastreabilidade
- ADR 008, 009, 010 e 012 em `docs/adr/`.

# ADR 024 — Client Review via Tokenized Public Link

## Status
Accepted

## Context

O fluxo de revisão pelo cliente exigia que o gestor (cliente) tivesse uma conta ativa
na plataforma para visualizar candidatos shortlistados. Isso criava atrito significativo
no processo de recrutamento, pois muitos gestores não queriam ou não podiam criar conta.

Alternativas avaliadas:

1. **Criar conta simplificada de cliente** — requer e-mail de confirmação, senha, onboarding.
   Atrito alto para revisão pontual.
2. **Usar o token guest já existente** — o `GuestSession` existe para candidatos e não é
   extensível para múltiplos itens de shortlist ou para um ator diferente (gestor vs. candidato).
3. **Token efêmero de revisão (escolhido)** — link de uso único por vacancy, TTL de 72h,
   sem criação de conta. Modelo análogo ao `GuestSession` mas para o ator "cliente".

## Decision

Adotar um token efêmero (`ClientReviewSession`) por vacancy com as seguintes propriedades:

- **Geração:** `crypto.randomBytes(32).toString('hex')` (256 bits de entropia)
- **TTL:** 72 horas (configurável via `BACKOFFICE_ORIGIN` env)
- **Escopo:** Uma `ClientReviewSession` por geração de link; cada chamada a
  `POST /shortlist/review-link` cria uma nova sessão
- **Permissão de leitura:** Qualquer portador do token lê a shortlist da vacancy
- **Permissão de escrita:** Portador do token pode registrar `ClientDecision` com
  `reviewerId = null` (sem conta)
- **Isolamento:** O token está vinculado a `vacancyId` + `organizationId`; decisões
  são validadas contra o `vacancyId` do token antes de persistir

## Consequences

### Positivas
- Headhunter gera e envia o link em segundos; cliente acessa sem cadastro
- Auditoria completa de todos os acessos e decisões (com `actorId = null`)
- Menor atrito no loop de feedback cliente ↔ headhunter
- Compatível com o `PublicTokenGuard` existente (extensão de tipo)
- `ClientDecision.reviewerId` tornado opcional suporta tanto o fluxo autenticado
  (revisor com JWT) quanto o fluxo público (token)

### Riscos e mitigações
- **Link compartilhado indevidamente:** TTL de 72h limita a janela de exposição.
  Rate limiting (30 req/min leitura, 20 req/min decisão) mitiga abuso.
- **Atribuição de decisão:** `reviewerId = null` significa que não há rastreabilidade
  de identidade do revisor. O `AuditEvent` registra `tokenId + vacancyId` para
  identificação forense da sessão.
- **Dados expostos:** O endpoint público retorna apenas campos necessários para
  avaliação (nome, foto, skills, vaga). PII sensível (email, telefone) é excluído.

## References

- ADR 006 — candidate-guest-tokenized (padrão precursor)
- ADR 015 — defensive-security-tenant-isolation
- ADR 016 — distributed-rate-limiting
- ADR 017 — token-cache-strategy
- `docs/sdd/modules/client-public-review/spec.md`

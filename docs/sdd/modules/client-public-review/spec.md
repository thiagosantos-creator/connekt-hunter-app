# Module Spec — Client Public Review (Tokenized)

## Objetivo

Permitir que o headhunter gere um link público com token efêmero para que o cliente avalie
candidatos da shortlist sem necessidade de cadastro ou login na plataforma.

---

## Fluxo principal

```
Headhunter
  → POST /shortlist/review-link { vacancyId }
  ← { url: "https://app.connekthunter.com/review/<token>", expiresAt }
  → Envia URL para o cliente (e-mail, WhatsApp, etc.)

Cliente (sem conta)
  → Abre /review/<token> no browser
  → Frontend: GET /shortlist/public/<token>
  ← Lista de ShortlistItems com dados públicos do candidato
  → POST /client-decisions/public { shortlistItemId, decision, token }
  ← Decisão registrada
```

---

## Contrato de segurança do token

| Propriedade | Valor |
|---|---|
| Geração | `crypto.randomBytes(32).toString('hex')` — 256 bits de entropia |
| Comprimento | 64 caracteres hexadecimais |
| TTL padrão | 72 horas a partir da criação |
| Escopo | Único por vacancy; um link por chamada |
| Rota válida | `/review/:token` → `GET /shortlist/public/:token` |
| Guard | `PublicTokenGuard` + `RateLimitGuard` |
| Tipo no cache | `'client-review-session'`, `subjectId = vacancyId` |

---

## Dados expostos ao cliente não autenticado

O endpoint `GET /shortlist/public/:token` retorna **apenas** os campos necessários para avaliação:

```ts
{
  id, applicationId, createdAt, currentDecision,
  candidate: { id, fullName, photoUrl },
  vacancy: {
    id, title, location, seniority, requiredSkills,
    organization: { name, tenantSettings: { logoUrl, primaryColor, secondaryColor, publicName } }
  }
}
```

**Não expostos:** `email`, `phone`, `token`, `salaryMin/Max`, `evaluations`, `smartInterviewSessions`.

---

## Decisões via token público

- Endpoint: `POST /client-decisions/public`
- Guard: `PublicTokenGuard` + `RateLimitGuard` (20 req/min)
- `reviewerId` armazenado como `null` no `ClientDecision`
- Validação de escopo: `shortlistItem.shortlist.vacancy.id === session.vacancyId`
- Decisões válidas: `approve`, `reject`, `interview`, `hold`

---

## Auditoria

Todos os eventos via token público criam `AuditEvent` com `actorId: null`:

| Evento | `action` | `entityType` |
|---|---|---|
| Acesso à shortlist | `client.public_review.access` | `ClientReviewSession` |
| Registro de decisão | `client.public_review.decision` | `ShortlistItem` |
| Geração de link | `shortlist.review_link_created` | `Vacancy` |

---

## Rate limiting

| Endpoint | Escopo | Limite |
|---|---|---|
| `GET /shortlist/public/:token` | `public-review` | 30 req/min/IP |
| `POST /client-decisions/public` | `public-decision` | 20 req/min/IP |
| `POST /shortlist/review-link` | (autenticado, sem rate limit extra) | — |

---

## Modelo Prisma: ClientReviewSession

```prisma
model ClientReviewSession {
  id              String    @id @default(cuid())
  token           String    @unique
  vacancyId       String
  organizationId  String
  createdByUserId String
  expiresAt       DateTime
  accessedAt      DateTime?
  createdAt       DateTime  @default(now())
  vacancy         Vacancy   @relation(fields: [vacancyId], references: [id], onDelete: Cascade)
}
```

---

## Impacto em modelos existentes

- `ClientDecision.reviewerId` passou de `String` (required) para `String?` (opcional), para
  suportar decisões registradas por visitantes sem conta.

---

## Frontend: PublicClientReviewView

- Rota: `/review/:token` — pública, sem `ProtectedRoute`, sem `NavBar`
- Exibe branding do tenant (`tenantSettings.logoUrl`, `primaryColor`)
- Decisões via diálogo de confirmação (UX reduzida a botões essenciais)
- Comentários via `POST /client-comments/public` (integração futura)
- 100% WCAG AA: usa tokens `*Dark` para texto sobre fundos claros

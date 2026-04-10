# Email Tracking Webhooks Spec

- Entrada webhook cria `WebhookDelivery` para auditoria.
- Eventos básicos: accepted, delivered, bounced, complained.
- Tentativa de correlação por `dispatchId` no payload.
- Falhas de correlação não quebram ingestão (best effort).

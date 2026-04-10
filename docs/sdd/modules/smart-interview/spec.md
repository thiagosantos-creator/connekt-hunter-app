# Module Spec — Smart Interview (Slice 04)

- Perguntas são geradas via `AiGateway`.
- Upload de respostas usa `StorageGateway` (S3/MinIO).
- Transcrição enfileirada por `TranscriptionGateway`.
- Submissão calcula análise assistiva sem decisão final automática.
- Review humano continua obrigatório para status final.


## Slice 09 update
- Endpoint público de sessão (`/candidate/session/:publicToken`) validado com token cache + throttling distribuído + `PublicTokenGuard`.
- Rate limiting configurável por endpoint: sessão/presign/complete a 30 req/min, submit a 20 req/min.

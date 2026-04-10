# Module Spec — Smart Interview (Slice 04)

- Perguntas são geradas via `AiGateway`.
- Upload de respostas usa `StorageGateway` (S3/MinIO).
- Transcrição enfileirada por `TranscriptionGateway`.
- Submissão calcula análise assistiva sem decisão final automática.
- Review humano continua obrigatório para status final.

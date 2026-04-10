# Transcription Gateway Spec

- Provider real habilitável por `FF_TRANSCRIPTION_REAL=true`.
- Fallback mock local.
- Processamento assíncrono por status (`queued/completed/failed`) em `TranscriptMetadata`.
- Retries e lastError persistidos.

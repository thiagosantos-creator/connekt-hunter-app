import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, getToken } from '../services/api.js';
import { StepIndicator } from '../components/layout/StepIndicator.js';
import { Button, Card, CardContent, InlineMessage, colors, spacing, fontSize, radius } from '@connekt/ui';

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

interface ResumeUploadResponse {
  id: string;
  objectKey: string;
  provider: string;
  upload: {
    url?: string;
    method?: 'PUT';
    headers?: Record<string, string>;
    uploadUrl?: string;
    uploadMethod?: 'PUT';
    uploadHeaders?: Record<string, string>;
  };
}

export function Step3ResumeView() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateFile = (f: File): string | null => {
    const dotIndex = f.name.lastIndexOf('.');
    const ext = dotIndex === -1 ? '' : f.name.toLowerCase().slice(dotIndex);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Formato não suportado. Use: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setError('');
    if (selected) {
      const validationError = validateFile(selected);
      if (validationError) {
        setError(validationError);
        setFile(null);
        return;
      }
    }
    setFile(selected);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Por favor, selecione um arquivo.'); return; }
    const validationError = validateFile(file);
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError('');
    try {
      const result = await apiPost<ResumeUploadResponse>('/candidate/onboarding/resume', {
        token: getToken(),
        filename: file.name,
        contentType: file.type || undefined,
      });

      // Upload actual file content to the presigned URL
      const uploadUrl = result.upload?.url ?? result.upload?.uploadUrl;
      const uploadMethod = result.upload?.method ?? result.upload?.uploadMethod ?? 'PUT';
      const uploadHeaders = result.upload?.headers ?? result.upload?.uploadHeaders ?? {};

      if (!uploadUrl) {
        throw new Error('Upload do currículo indisponível no momento. Tente novamente mais tarde.');
      }

      const uploadRes = await fetch(uploadUrl, {
        method: uploadMethod,
        headers: uploadHeaders,
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error(
          uploadRes.status === 403
            ? 'Acesso negado ao armazenamento. O link de upload pode ter expirado. Recarregue a página e tente novamente.'
            : 'Falha ao enviar currículo para o armazenamento. Tente novamente.',
        );
      }

      await apiPost('/candidate/onboarding/resume/complete', {
        token: getToken(),
        resumeId: result.id,
        filename: file.name,
      });

      navigate('/onboarding/media-check');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('storage_object_empty')) {
        setError('O arquivo enviado não pôde ser processado. Verifique sua conexão e tente novamente.');
      } else if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('CORS')) {
        setError('Não foi possível conectar ao servidor de armazenamento. Verifique sua conexão e tente novamente.');
      } else {
        setError(message || 'Erro inesperado ao enviar currículo. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: `0 ${spacing.md}px` }}>
      <StepIndicator current={3} />
      <Card>
        <CardContent>
          <h2 style={{ margin: `0 0 ${spacing.sm}px`, color: colors.text }}>Passo 3 — Upload do Currículo</h2>
          <p style={{ color: colors.textSecondary, fontSize: fontSize.md, marginBottom: spacing.md }}>
            Envie seu currículo em formato PDF, DOC ou DOCX.
          </p>
          <form onSubmit={(e) => { void submit(e); }}>
            <div
              style={{
                border: `2px dashed ${colors.border}`,
                borderRadius: radius.lg,
                padding: spacing.xl,
                textAlign: 'center',
                marginBottom: spacing.md,
                background: colors.surfaceAlt,
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: spacing.sm }}>📄</div>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                style={{ display: 'block', margin: '0 auto' }}
              />
              <p style={{ marginTop: spacing.xs, color: colors.textSecondary, fontSize: fontSize.xs }}>
                Formatos aceitos: {ALLOWED_EXTENSIONS.map((ext) => ext.slice(1).toUpperCase()).join(', ')} — Máx. {MAX_FILE_SIZE_MB} MB
              </p>
              {file && (
                <p style={{ marginTop: spacing.sm, color: colors.text, fontSize: fontSize.sm }}>
                  Selecionado: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
                </p>
              )}
            </div>
            {error && <InlineMessage variant="error">{error}</InlineMessage>}
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button variant="secondary" type="button" onClick={() => navigate('/onboarding/consent')}>
                ← Voltar
              </Button>
              <Button type="submit" loading={loading} disabled={!file}>
                {loading ? 'Enviando…' : 'Enviar Candidatura →'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

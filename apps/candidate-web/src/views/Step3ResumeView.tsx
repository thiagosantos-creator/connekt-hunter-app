import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, getToken } from '../services/api.js';
import { StepIndicator } from '../components/layout/StepIndicator.js';
import { Button, Card, CardContent, InlineMessage, colors, spacing, fontSize, radius } from '@connekt/ui';

export function Step3ResumeView() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Por favor, selecione um arquivo.'); return; }
    setLoading(true);
    setError('');
    try {
      await apiPost('/candidate/onboarding/resume', { token: getToken(), filename: file.name });
      navigate('/status');
    } catch (err) {
      setError(String(err));
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
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ display: 'block', margin: '0 auto' }}
              />
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

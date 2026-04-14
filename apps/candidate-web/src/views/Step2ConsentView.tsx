import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, getToken } from '../services/api.js';
import { StepIndicator } from '../components/layout/StepIndicator.js';
import { Button, Card, CardContent, Checkbox, InlineMessage, colors, spacing, fontSize, radius } from '@connekt/ui';

export function Step2ConsentView() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) { setError('Você precisa aceitar para continuar.'); return; }
    setLoading(true);
    setError('');
    try {
      await apiPost('/candidate/onboarding/consent', { token: getToken() });
      navigate('/onboarding/resume');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: `0 ${spacing.md}px` }}>
      <StepIndicator current={2} />
      <Card>
        <CardContent>
          <h2 style={{ margin: `0 0 ${spacing.lg}px`, color: colors.text }}>Passo 2 — LGPD / Termos de Uso</h2>
          <div
            style={{
              border: `1px solid ${colors.border}`,
              padding: spacing.md,
              borderRadius: radius.md,
              marginBottom: spacing.md,
              maxHeight: 200,
              overflow: 'auto',
              fontSize: fontSize.sm,
              color: colors.textSecondary,
              background: colors.surfaceAlt,
            }}
          >
            <strong>Lei Geral de Proteção de Dados (LGPD)</strong>
            <p>
              Ao aceitar, você autoriza o armazenamento e processamento dos seus dados pessoais, incluindo o currículo,
              para fins de recrutamento e seleção pela plataforma Connekt Hunter e suas organizações parceiras.
            </p>
            <p>
              Seus dados serão tratados com confidencialidade e utilizados exclusivamente para as finalidades descritas.
              Você pode solicitar a exclusão dos seus dados a qualquer momento.
            </p>
            <strong>Termos de Uso</strong>
            <p>
              Ao utilizar esta plataforma, você concorda com os termos de uso e declara que as informações fornecidas
              são verdadeiras.
            </p>
          </div>
          <form onSubmit={(e) => { void submit(e); }}>
            <Checkbox
              label="Li e aceito a política de privacidade (LGPD) e os Termos de Uso"
              checked={accepted}
              onChange={(checked) => setAccepted(checked)}
            />
            {error && <div style={{ marginTop: spacing.sm }}><InlineMessage variant="error">{error}</InlineMessage></div>}
            <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
              <Button variant="secondary" type="button" onClick={() => navigate('/onboarding/basic')}>
                ← Voltar
              </Button>
              <Button type="submit" loading={loading} disabled={!accepted}>
                {loading ? 'Salvando…' : 'Aceitar e Continuar →'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

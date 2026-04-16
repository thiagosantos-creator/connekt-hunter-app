import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import { extractErrorMessage } from '../services/error-messages.js';
import type { CandidateInfo } from '../services/types.js';
import { resolveNextOnboardingStep } from './onboarding-flow.js';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, InlineMessage, Input, spacing } from '@connekt/ui';

export function TokenEntryView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const accessCandidate = async (rawToken: string) => {
    const normalized = rawToken.trim();
    if (!normalized) return;
    setLoading(true);
    setError('');
    try {
      const candidate = await apiGet<CandidateInfo>(`/candidate/token/${encodeURIComponent(normalized)}`);
      if (!candidate) {
        setError('Código de acesso não encontrado. Verifique se o código está correto.');
        return;
      }
      localStorage.setItem('invite_token', normalized);
      localStorage.setItem('candidate_info', JSON.stringify(candidate));
      navigate(resolveNextOnboardingStep(candidate.onboarding), { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryToken = searchParams.get('token');
    if (!queryToken) return;
    void accessCandidate(queryToken);
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await accessCandidate(token);
  };

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: `0 ${spacing.md}px` }}>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Portal do Candidato</CardTitle>
          <CardDescription>Insira o código ou use o link recebido por e-mail, SMS ou WhatsApp para continuar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { void submit(e); }}>
            <Input
              label="Código de acesso"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              placeholder="Cole aqui o código recebido"
              hint="Use o código enviado por e-mail, SMS ou WhatsApp. O código é longo — copie e cole para evitar erros."
              style={{ fontFamily: 'monospace' }}
            />
            {error && <InlineMessage variant="error">{error}</InlineMessage>}
            <Button type="submit" loading={loading} style={{ width: '100%', marginTop: spacing.sm }}>
              {loading ? 'Verificando...' : 'Continuar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

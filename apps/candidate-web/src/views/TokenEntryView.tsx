import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import type { CandidateInfo } from '../services/types.js';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, InlineMessage, colors, spacing, fontSize } from '@connekt/ui';

export function TokenEntryView() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const c = await apiGet<CandidateInfo>(`/candidate/token/${encodeURIComponent(token)}`);
      if (!c) { setError('Token não encontrado'); return; }
      localStorage.setItem('invite_token', token);
      localStorage.setItem('candidate_info', JSON.stringify(c));

      const onb = c.onboarding;
      if (onb?.status === 'completed') { navigate('/status'); return; }
      if (!onb?.basicCompleted) { navigate('/onboarding/basic'); return; }
      if (!onb?.consentCompleted) { navigate('/onboarding/consent'); return; }
      navigate('/onboarding/resume');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: `0 ${spacing.md}px` }}>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Portal do Candidato</CardTitle>
          <CardDescription>Insira o código de acesso recebido por e-mail para continuar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { void submit(e); }}>
            <Input
              label="Código de Acesso"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              style={{ fontFamily: 'monospace' }}
            />
            {error && <InlineMessage variant="error">{error}</InlineMessage>}
            <Button type="submit" loading={loading} style={{ width: '100%', marginTop: spacing.sm }}>
              {loading ? 'Verificando…' : 'Continuar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

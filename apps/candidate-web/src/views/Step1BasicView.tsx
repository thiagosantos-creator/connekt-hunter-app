import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, getToken } from '../services/api.js';
import { StepIndicator } from '../components/layout/StepIndicator.js';
import { Button, Input, Card, CardContent, InlineMessage, colors, spacing } from '@connekt/ui';

export function Step1BasicView() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePhone = (value: string): boolean => {
    if (!value.trim()) return true; // optional
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 13;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('Nome completo é obrigatório.'); return; }
    if (phone.trim() && !validatePhone(phone)) {
      setError('Telefone inválido. Use o formato (XX) XXXXX-XXXX.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiPost('/candidate/onboarding/basic', { token: getToken(), fullName, phone });
      navigate('/onboarding/consent');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: `0 ${spacing.md}px` }}>
      <StepIndicator current={1} />
      <Card>
        <CardContent>
          <h2 style={{ margin: `0 0 ${spacing.lg}px`, color: colors.text }}>Passo 1 — Dados Básicos</h2>
          <form onSubmit={(e) => { void submit(e); }}>
            <Input label="Nome Completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Input label="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(XX) XXXXX-XXXX" />
            {error && <InlineMessage variant="error">{error}</InlineMessage>}
            <Button type="submit" loading={loading} style={{ marginTop: spacing.sm }}>
              {loading ? 'Salvando…' : 'Próximo →'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

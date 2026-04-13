import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, getToken } from '../services/api.js';
import type { CandidateInfo } from '../services/types.js';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, InlineMessage, Input, colors, fontSize, spacing } from '@connekt/ui';

export function StatusView() {
  const navigate = useNavigate();
  const raw = localStorage.getItem('candidate_info');
  const info: Partial<CandidateInfo> = raw ? (JSON.parse(raw) as Partial<CandidateInfo>) : {};
  const [email, setEmail] = useState(info.email ?? '');
  const [fullName, setFullName] = useState(info.profile?.fullName ?? '');
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [interviewToken, setInterviewToken] = useState('');

  const upgradeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgrading(true);
    setUpgradeMsg('');
    try {
      await apiPost('/auth/guest-upgrade', { token: getToken(), email, fullName });
      setUpgradeMsg('Conta criada com sucesso. Você poderá usar login completo em breve.');
    } catch (err) {
      setUpgradeMsg(`Falha no upgrade: ${String(err)}`);
    } finally {
      setUpgrading(false);
    }
  };

  const goToInterview = () => {
    if (!interviewToken.trim()) return;
    localStorage.setItem('si_public_token', interviewToken.trim());
    navigate('/interview');
  };

  return (
    <div style={{ maxWidth: 520, margin: '60px auto', padding: `0 ${spacing.md}px` }}>
      <Card variant="elevated" style={{ textAlign: 'center' }}>
        <CardContent>
          <h2 style={{ margin: `0 0 ${spacing.sm}px`, color: colors.text }}>Candidatura enviada</h2>
          <p style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
            Olá <strong>{info.profile?.fullName ?? info.email ?? 'Candidato'}</strong>,
          </p>
          <p style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
            sua candidatura foi recebida. Nossa equipe vai analisar seu perfil e seu currículo.
          </p>
        </CardContent>
      </Card>

      <Card style={{ marginTop: spacing.md, background: colors.infoLight }}>
        <CardHeader>
          <CardTitle style={{ color: colors.info }}>Próximos passos</CardTitle>
        </CardHeader>
        <CardContent>
          <ol style={{ textAlign: 'left', color: colors.textSecondary, paddingLeft: spacing.lg, margin: 0 }}>
            <li style={{ marginBottom: spacing.sm }}>Seu currículo será processado automaticamente.</li>
            <li style={{ marginBottom: spacing.sm }}>Um recrutador vai revisar sua candidatura.</li>
            <li style={{ marginBottom: spacing.sm }}>Se fizer sentido, você poderá ser convidado para uma entrevista inteligente.</li>
            <li>Você será notificado sobre o resultado.</li>
          </ol>
        </CardContent>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <CardHeader>
          <CardTitle>Entrevista inteligente</CardTitle>
          <CardDescription>Se recebeu um código de entrevista, insira abaixo para iniciar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input
                placeholder="Código da entrevista"
                value={interviewToken}
                onChange={(e) => setInterviewToken(e.target.value)}
              />
            </div>
            <Button variant="primary" onClick={goToInterview} disabled={!interviewToken.trim()}>
              Iniciar entrevista
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <CardHeader>
          <CardTitle>Opcional: criar conta</CardTitle>
          <CardDescription>Faça upgrade de convidado para uma conta registrada.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { void upgradeAccount(e); }}>
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            {upgradeMsg && (
              <InlineMessage variant={upgradeMsg.startsWith('Falha') ? 'error' : 'success'}>
                {upgradeMsg}
              </InlineMessage>
            )}
            <Button type="submit" loading={upgrading} variant="outline">
              {upgrading ? 'Criando...' : 'Criar conta'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div style={{ textAlign: 'center', marginTop: spacing.lg }}>
        <Button
          variant="ghost"
          onClick={() => {
            localStorage.clear();
            navigate('/');
          }}
        >
          Iniciar nova candidatura
        </Button>
      </div>
    </div>
  );
}

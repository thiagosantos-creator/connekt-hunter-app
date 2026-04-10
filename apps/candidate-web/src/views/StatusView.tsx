import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiPost, getToken } from '../services/api.js';
import type { CandidateInfo } from '../services/types.js';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, InlineMessage, colors, spacing, fontSize, radius } from '@connekt/ui';

export function StatusView() {
  const navigate = useNavigate();
  const raw = localStorage.getItem('candidate_info');
  const info: Partial<CandidateInfo> = raw ? (JSON.parse(raw) as Partial<CandidateInfo>) : {};
  const [email, setEmail] = useState(info.email ?? '');
  const [fullName, setFullName] = useState(info.profile?.fullName ?? '');
  const [password, setPassword] = useState('');
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [upgrading, setUpgrading] = useState(false);

  const upgradeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password.length < 8) {
      setUpgradeMsg('Falha: A senha deve conter ao menos 8 caracteres.');
      return;
    }
    setUpgrading(true);
    setUpgradeMsg('');
    try {
      const result = await apiPost<{ token?: string }>('/auth/guest-upgrade', {
        token: getToken(),
        email,
        fullName,
        password: password || undefined,
      });
      if (result?.token) {
        localStorage.setItem('candidate_session_token', result.token);
      }
      setUpgradeMsg('Conta criada com sucesso! Acesse "Minha Conta" para gerenciar sua senha.');
    } catch (err) {
      setUpgradeMsg(`Falha no upgrade: ${String(err)}`);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '60px auto', padding: `0 ${spacing.md}px` }}>
      <Card variant="elevated" style={{ textAlign: 'center' }}>
        <CardContent>
          <div style={{ fontSize: 64, marginBottom: spacing.md }}>🎉</div>
          <h2 style={{ margin: `0 0 ${spacing.sm}px`, color: colors.text }}>Candidatura Enviada!</h2>
          <p style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
            Olá <strong>{info.profile?.fullName ?? info.email ?? 'Candidato'}</strong>,
          </p>
          <p style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
            Sua candidatura foi recebida. Nossa equipe irá analisar seu perfil e currículo.
          </p>
        </CardContent>
      </Card>

      <Card style={{ marginTop: spacing.md, background: colors.infoLight }}>
        <CardHeader>
          <CardTitle style={{ color: colors.info }}>Próximos Passos</CardTitle>
        </CardHeader>
        <CardContent>
          <ol style={{ textAlign: 'left', color: colors.textSecondary, paddingLeft: spacing.lg, margin: 0 }}>
            <li style={{ marginBottom: spacing.sm }}>Seu currículo será processado automaticamente.</li>
            <li style={{ marginBottom: spacing.sm }}>Um recrutador irá revisar sua candidatura.</li>
            <li style={{ marginBottom: spacing.sm }}>Se selecionado, o cliente tomará uma decisão.</li>
            <li>Você será notificado sobre o resultado.</li>
          </ol>
        </CardContent>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <CardHeader>
          <CardTitle>Opcional: Criar Conta</CardTitle>
          <CardDescription>Faça upgrade de convidado para uma conta registrada com senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { void upgradeAccount(e); }} style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Nome Completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Input
              label="Senha (opcional)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mín. 8 caracteres — deixe vazio para acesso por token"
            />
            {upgradeMsg && (
              <InlineMessage variant={upgradeMsg.startsWith('Falha') ? 'error' : 'success'}>
                {upgradeMsg}
              </InlineMessage>
            )}
            <Button type="submit" loading={upgrading} variant="outline">
              {upgrading ? 'Criando…' : 'Criar Conta'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.md, marginTop: spacing.lg }}>
        <Link to="/account" style={{ color: colors.accent, textDecoration: 'none', fontSize: fontSize.sm }}>
          Minha Conta
        </Link>
        <Button
          variant="ghost"
          onClick={() => { localStorage.clear(); navigate('/'); }}
        >
          Iniciar Nova Candidatura
        </Button>
      </div>
    </div>
  );
}

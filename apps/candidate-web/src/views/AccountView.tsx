import React, { useState } from 'react';
import { apiPost, getToken } from '../services/api.js';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  InlineMessage,
  spacing,
  colors,
} from '@connekt/ui';

export function AccountView() {
  const raw = localStorage.getItem('candidate_info');
  const info = raw ? (JSON.parse(raw) as { email?: string; profile?: { fullName?: string } }) : {};

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');

    if (newPassword.length < 8) {
      setMsg('A nova senha deve conter ao menos 8 caracteres.');
      setMsgVariant('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg('As senhas não coincidem.');
      setMsgVariant('error');
      return;
    }

    setLoading(true);
    try {
      await apiPost('/auth/change-password', {
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMsg('Senha alterada com sucesso!');
      setMsgVariant('success');
    } catch (err) {
      setMsg(`Erro: ${String(err)}`);
      setMsgVariant('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: `0 ${spacing.md}px` }}>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Minha Conta</CardTitle>
          <CardDescription>
            {info.profile?.fullName ?? info.email ?? 'Candidato'} — gerencie sua senha e segurança.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ marginBottom: spacing.lg, padding: spacing.md, background: colors.surfaceAlt, borderRadius: 8 }}>
            <p style={{ margin: 0, color: colors.textSecondary }}>
              <strong>E-mail:</strong> {info.email ?? '—'}
            </p>
            <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.textSecondary }}>
              <strong>Nome:</strong> {info.profile?.fullName ?? '—'}
            </p>
          </div>

          <h3 style={{ margin: `0 0 ${spacing.sm}px`, color: colors.text }}>Trocar Senha</h3>
          <form onSubmit={(e) => { void changePassword(e); }} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="Senha atual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Deixe em branco se nunca definiu uma senha"
            />
            <Input
              label="Nova senha"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
              required
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              required
            />

            {msg && <InlineMessage variant={msgVariant}>{msg}</InlineMessage>}

            <Button type="submit" loading={loading}>
              {loading ? 'Salvando…' : 'Alterar Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

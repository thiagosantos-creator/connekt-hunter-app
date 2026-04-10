import { useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { addAuditEvent, generateMockMfaQr, saveProfile } from '../services/account.js';
import {
  PageContent,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  InlineMessage,
  spacing,
  colors,
} from '@connekt/ui';

const roleExperience: Record<string, { title: string; description: string }> = {
  admin: {
    title: 'Modo Gestão',
    description: 'Você possui visão completa do tenant, usuários e governança.',
  },
  headhunter: {
    title: 'Modo Operação',
    description: 'A experiência prioriza velocidade operacional na gestão de vagas e candidatos.',
  },
  client: {
    title: 'Modo Decisão',
    description: 'A experiência simplifica decisões com foco em aprovar, rejeitar ou solicitar entrevista.',
  },
};

export function AccountView() {
  const { user, refreshAuth } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [title, setTitle] = useState(user?.title ?? '');
  const [company, setCompany] = useState(user?.company ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [password, setPassword] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [feedback, setFeedback] = useState('');

  const exp = useMemo(() => roleExperience[user?.role ?? 'client'], [user?.role]);

  if (!user) return null;

  const save = () => {
    saveProfile({ ...user, name, title, company, avatarUrl });
    addAuditEvent('profile.updated', user.email, user.id);
    refreshAuth();
    setFeedback('Perfil atualizado com sucesso.');
  };

  const changePassword = () => {
    if (password.length < 8) {
      setFeedback('Senha deve conter ao menos 8 caracteres.');
      return;
    }
    addAuditEvent('password.changed', user.email, user.id);
    setPassword('');
    setFeedback('Senha alterada com sucesso.');
  };

  const toggleMfa = () => {
    const next = !mfaEnabled;
    setMfaEnabled(next);
    addAuditEvent(next ? 'mfa.enabled' : 'mfa.disabled', user.email, user.id);
    setFeedback(next ? 'MFA ativado.' : 'MFA desativado.');
  };

  return (
    <PageContent>
      <PageHeader title="Conta e Segurança" description="Gerencie seus dados, segurança e experiência por perfil." />

      {feedback && <InlineMessage variant="success">{feedback}</InlineMessage>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg, marginTop: spacing.md }}>
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Dados básicos da conta.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input label="Foto (URL)" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Cargo" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input label="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} />
            <Button onClick={save}>Salvar perfil</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>Troca de senha e autenticação em dois fatores.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="Nova senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
            />
            <Button variant="outline" onClick={changePassword}>Trocar senha</Button>

            <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: spacing.md }}>
              <strong>MFA</strong>
              <p style={{ marginTop: spacing.xs, marginBottom: spacing.sm }}>
                {mfaEnabled ? 'MFA ativo para seu login.' : 'MFA inativo. Ative para reforçar a segurança.'}
              </p>
              {!mfaEnabled && (
                <code style={{ display: 'block', fontSize: 12, marginBottom: spacing.sm }}>
                  {generateMockMfaQr(user.email)}
                </code>
              )}
              <Button variant={mfaEnabled ? 'ghost' : 'secondary'} onClick={toggleMfa}>
                {mfaEnabled ? 'Desativar MFA' : 'Ativar MFA (QR Code)'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card style={{ marginTop: spacing.lg }}>
        <CardHeader>
          <CardTitle>{exp.title}</CardTitle>
          <CardDescription>{exp.description}</CardDescription>
        </CardHeader>
      </Card>
    </PageContent>
  );
}

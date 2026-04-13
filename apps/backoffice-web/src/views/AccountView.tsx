import { useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { generateMockMfaQr, saveProfile } from '../services/account.js';
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
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackVariant, setFeedbackVariant] = useState<'success' | 'error'>('success');

  const exp = useMemo(() => roleExperience[user?.role ?? 'client'], [user?.role]);

  if (!user) return null;

  const save = () => {
    saveProfile({ ...user, name, title, company, avatarUrl });
    refreshAuth();
    setFeedback('Perfil atualizado com sucesso.');
    setFeedbackVariant('success');
  };

  const toggleMfa = () => {
    const next = !mfaEnabled;
    setMfaEnabled(next);
    setFeedback(next ? 'MFA ativado.' : 'MFA desativado.');
    setFeedbackVariant('success');
  };

  return (
    <PageContent>
      <PageHeader title="Conta e Segurança" description="Gerencie seus dados, segurança e experiência por perfil." />

      {feedback && <InlineMessage variant={feedbackVariant}>{feedback}</InlineMessage>}

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
            <CardDescription>Autenticação gerenciada pelo provedor de identidade (Cognito).</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <InlineMessage variant="info">
              Sua senha e login social são gerenciados pelo Cognito.
              Para alterar senha ou vincular Google/LinkedIn, utilize o portal do provedor de identidade.
            </InlineMessage>

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

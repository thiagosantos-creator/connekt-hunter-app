import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { saveProfile } from '../services/account.js';
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
  const [feedback, setFeedback] = useState('');
  const [feedbackVariant, setFeedbackVariant] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);

  const exp = useMemo(() => roleExperience[user?.role ?? 'client'], [user?.role]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  if (!user) return null;

  const save = () => {
    if (!name.trim()) {
      setFeedback('O nome é obrigatório.');
      setFeedbackVariant('error');
      return;
    }
    setSaving(true);
    try {
      saveProfile({ ...user, name, title, company, avatarUrl });
      refreshAuth();
      setFeedback('Perfil atualizado com sucesso.');
      setFeedbackVariant('success');
    } catch (err) {
      setFeedback(`Erro ao salvar: ${String(err)}`);
      setFeedbackVariant('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContent>
      <PageHeader title="Conta e Segurança" description="Gerencie seus dados, segurança e experiência por perfil." />

      {feedback && <InlineMessage variant={feedbackVariant} onDismiss={() => setFeedback('')}>{feedback}</InlineMessage>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg, marginTop: spacing.md }}>
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Dados básicos da conta.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input label="Foto (URL)" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Cargo" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input label="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} />
            <Button onClick={save} loading={saving}>Salvar perfil</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>Autenticação gerenciada pelo provedor de identidade (Cognito).</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <InlineMessage variant="info">
              Sua senha, login social e MFA são gerenciados pelo Cognito.
              Para alterar senha, vincular Google/LinkedIn ou configurar MFA, utilize o portal do provedor de identidade.
            </InlineMessage>
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

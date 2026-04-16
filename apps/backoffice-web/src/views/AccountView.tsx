import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { updateMyProfile, uploadMyAvatar } from '../services/account.js';
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
  FileUpload,
  spacing,
  colors,
  radius,
  fontSize,
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
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [feedback, setFeedback] = useState('');
  const [feedbackVariant, setFeedbackVariant] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const exp = useMemo(() => roleExperience[user?.role ?? 'client'], [user?.role]);
  const organizationSummary = user?.organizationIds?.length
    ? user.organizationIds.join(', ')
    : 'Nenhuma organização vinculada';

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  if (!user) return null;

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    setFeedback('');
    try {
      const result = await uploadMyAvatar(file);
      setAvatarUrl(result.avatarUrl);
      setFeedback('Foto de perfil enviada com sucesso. Clique em salvar para persistir os outros dados.');
      setFeedbackVariant('success');
    } catch (err) {
      setFeedback(`Erro no upload: ${String(err)}`);
      setFeedbackVariant('error');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setFeedback('O nome é obrigatório.');
      setFeedbackVariant('error');
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({ name: name.trim(), title: title.trim(), avatarUrl });
      await refreshAuth();
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: spacing.lg, marginTop: spacing.md }}>
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Dados básicos da conta e avatar corporativo.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div style={{ background: colors.surfaceAlt, padding: spacing.lg, borderRadius: radius.lg, border: `1px solid ${colors.border}` }}>
                <FileUpload
                    label="Foto de perfil"
                    description="JPG, PNG ou GIF. Máximo 2MB."
                    value={avatarUrl}
                    onFileSelect={handleAvatarUpload}
                    previewType="avatar"
                    loading={uploading}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input label="Cargo" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div style={{ padding: spacing.md, border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.surfaceAlt }}>
              <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>Organizações vinculadas</div>
              <strong style={{ display: 'block', fontSize: fontSize.md }}>{organizationSummary}</strong>
            </div>

            <Button onClick={() => { void save(); }} loading={saving} style={{ alignSelf: 'flex-start', minWidth: 160 }}>
                Salvar alterações
            </Button>
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

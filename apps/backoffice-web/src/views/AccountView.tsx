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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackVariant, setFeedbackVariant] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);

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

  const save = async () => {
    if (!name.trim()) {
      setFeedback('O nome é obrigatório.');
      setFeedbackVariant('error');
      return;
    }
    setSaving(true);
    try {
      let avatarUrl = user.avatarUrl;
      if (avatarFile) {
        const uploaded = await uploadMyAvatar(avatarFile);
        avatarUrl = uploaded.avatarUrl;
      }

      await updateMyProfile({ name: name.trim(), title: title.trim(), avatarUrl });
      await refreshAuth();
      setAvatarFile(null);
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
            <CardDescription>Dados básicos da conta e avatar com upload para storage.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, padding: spacing.md, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', background: colors.surfaceAlt }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: colors.surfaceAlt,
                    color: colors.textSecondary,
                    fontSize: fontSize.lg,
                    fontWeight: 700,
                  }}
                >
                  {(user.name || user.email).slice(0, 1).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <label htmlFor="avatar-upload" style={{ display: 'block', fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>
                  Foto de perfil
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
                <div style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>
                  {avatarFile ? `Arquivo selecionado: ${avatarFile.name}` : 'Selecione uma imagem para enviar ao bucket S3/MinIO.'}
                </div>
              </div>
            </div>
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Cargo" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div style={{ padding: spacing.md, border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.surfaceAlt }}>
              <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>Organizações vinculadas</div>
              <strong>{organizationSummary}</strong>
            </div>
            <Button onClick={() => { void save(); }} loading={saving}>Salvar perfil</Button>
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

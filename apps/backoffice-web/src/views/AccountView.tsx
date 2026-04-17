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
  shadows,
  fontWeight,
  Badge,
} from '@connekt/ui';

const roleExperience: Record<string, { title: string; description: string; badge: string; color: string }> = {
  admin: {
    title: 'Modo Gestão',
    description: 'Gestão completa do tenant, usuários e governança.',
    badge: 'ADMIN',
    color: colors.danger,
  },
  headhunter: {
    title: 'Modo Operação',
    description: 'Experiência focada em velocidade operacional, gestão de vagas e talentos.',
    badge: 'RECRUITER',
    color: colors.accent,
  },
  client: {
    title: 'Modo Decisão',
    description: 'Foco em decisões rápidas: Aprovar, Rejeitar ou Entrevistar.',
    badge: 'CLIENT',
    color: colors.success,
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
    const timer = setTimeout(() => setFeedback(''), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  if (!user) return null;

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    setFeedback('');
    try {
      const result = await uploadMyAvatar(file);
      setAvatarUrl(result.avatarUrl);
      setFeedback('Foto de perfil enviada com sucesso. Clique em salvar para persistir os dados.');
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
      <PageHeader 
        title="Conta e Segurança" 
        description="Gerencie seus dados e as configurações corporativas." 
      />

      {feedback && (
        <div style={{ animation: 'fadeIn 0.3s ease', marginBottom: spacing.md }}>
          <InlineMessage variant={feedbackVariant} onDismiss={() => setFeedback('')}>
            {feedback}
          </InlineMessage>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', 
        gap: spacing.xl, 
        marginTop: spacing.md,
        alignItems: 'start'
      }}>
        {/* Left Column: Profile form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          <Card style={{ border: `1px solid ${colors.borderLight}`, boxShadow: shadows.md, overflow: 'hidden' }}>
            <div style={{ 
              height: 48, 
              background: `linear-gradient(135deg, ${colors.primary} 0%, rgba(20,20,30,0.8) 100%)`,
              borderBottom: `1px solid ${colors.border}`
             }} />
            <div style={{ padding: spacing.xl, paddingTop: 0, marginTop: -24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: spacing.lg, marginBottom: spacing.lg }}>
                <div style={{ 
                  background: colors.surface, 
                  borderRadius: radius.xl, 
                  padding: 4, 
                  boxShadow: shadows.md 
                }}>
                  <FileUpload
                      label=""
                      description=""
                      value={avatarUrl}
                      onFileSelect={handleAvatarUpload}
                      previewType="avatar"
                      loading={uploading}
                  />
                </div>
                <div style={{ paddingBottom: spacing.sm }}>
                  <h3 style={{ margin: 0, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text }}>Seu Perfil</h3>
                  <p style={{ margin: 0, color: colors.textMuted, fontSize: fontSize.sm }}>Visível no tenant e ecossistema</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg, marginBottom: spacing.lg }}>
                  <Input label="Nome Completo" value={name} onChange={(e) => setName(e.target.value)} required />
                  <Input label="Cargo" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Tech Recruiter" />
              </div>

              <Button onClick={() => { void save(); }} loading={saving} style={{ paddingLeft: spacing.xl, paddingRight: spacing.xl }}>
                  {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Security & Role */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Card style={{ border: `1px solid ${colors.borderLight}`, boxShadow: shadows.sm }}>
            <CardHeader style={{ paddingBottom: spacing.sm }}>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ fontSize: 20 }}>🛡️</span> Segurança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ 
                padding: spacing.md, 
                borderRadius: radius.md, 
                background: colors.surfaceAlt, 
                border: `1px dashed ${colors.border}`,
                marginBottom: spacing.md
              }}>
                <InlineMessage variant="info">
                  Autenticação segura (SSO/MFA) provida exclusivamente pelo Cognito.
                </InlineMessage>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Organizações Vinculadas
                </span>
                <span style={{ fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium }}>
                  {organizationSummary}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card style={{ 
            background: `linear-gradient(to right bottom, ${colors.surface}, ${colors.surfaceAlt})`,
            border: `1px solid ${exp.color}40`,
            boxShadow: `0 4px 20px ${exp.color}15`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '4px', background: exp.color }} />
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Badge style={{ background: `${exp.color}20`, color: exp.color, border: `1px solid ${exp.color}50`, marginBottom: spacing.xs }}>
                    {exp.badge}
                  </Badge>
                  <CardTitle style={{ marginTop: spacing.xs }}>{exp.title}</CardTitle>
                  <CardDescription style={{ maxWidth: 280 }}>{exp.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </PageContent>
  );
}

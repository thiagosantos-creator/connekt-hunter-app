import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, getToken } from '../services/api.js';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  InlineMessage,
  LoadingState,
  spacing,
  colors,
  fontSize,
  fontWeight,
  radius,
  shadows,
} from '@connekt/ui';

interface CandidateAuthConfig {
  provider: string;
  hostedUiUrl: string | null;
  changePasswordUrl: string | null;
  socialProviders: string[];
}

interface PhotoUploadResponse {
  objectKey: string;
  upload: { url: string; method: 'PUT'; headers: Record<string, string> };
}

const SOCIAL_PROVIDER_ICONS: Record<string, string> = {
  Google: '🔵',
  LinkedIn: '🔷',
};

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_MB = 5;

function AvatarUpload({ currentPhotoUrl, onUploaded }: { currentPhotoUrl: string | null; onUploaded: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFile = async (file: File) => {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError('Formato não suportado. Use JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setError(`Imagem muito grande. Máximo: ${MAX_PHOTO_MB} MB.`);
      return;
    }

    // Local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = getToken();
      const result = await apiPost<PhotoUploadResponse>('/candidate/profile/photo', {
        token,
        filename: file.name,
        contentType: file.type,
      });

      const uploadRes = await fetch(result.upload.url, {
        method: result.upload.method,
        headers: result.upload.headers,
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Falha ao enviar imagem para o servidor.');

      const confirm = await apiPost<{ ok: boolean; photoUrl: string }>(
        '/candidate/profile/photo/confirm',
        { token, objectKey: result.objectKey },
      );

      // Update candidate_info in localStorage
      const raw = localStorage.getItem('candidate_info');
      if (raw) {
        const info = JSON.parse(raw) as Record<string, unknown>;
        const profile = (info.profile ?? {}) as Record<string, unknown>;
        profile.photoUrl = confirm.photoUrl;
        info.profile = profile;
        localStorage.setItem('candidate_info', JSON.stringify(info));
      }

      setSuccess(true);
      onUploaded(confirm.photoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg }}>
      {/* Avatar circle */}
      <div
        onClick={() => !loading && fileRef.current?.click()}
        style={{
          width: 80, height: 80, borderRadius: radius.full, flexShrink: 0,
          background: preview ? 'transparent' : colors.accent,
          border: `3px solid ${colors.borderLight}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: loading ? 'default' : 'pointer',
          overflow: 'hidden', position: 'relative',
          boxShadow: shadows.md,
          transition: 'box-shadow 0.2s',
        }}
        title="Clique para alterar a foto"
      >
        {preview ? (
          <img src={preview} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 32, color: colors.textInverse }}>👤</span>
        )}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, background: colors.overlayInverseHeavy,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>⏳</div>
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: colors.overlayInverseHeavy,
          color: colors.textInverse, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
          textAlign: 'center', padding: '3px 0',
          opacity: loading ? 0 : 1, transition: 'opacity 0.2s',
        }}>
          EDITAR
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs }}>
          Foto de perfil
        </div>
        <div style={{ fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm }}>
          JPEG, PNG ou WebP · máx. {MAX_PHOTO_MB} MB
        </div>
        {success && !error && (
          <span style={{ fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.semibold }}>✅ Foto atualizada!</span>
        )}
        {error && <span style={{ fontSize: fontSize.xs, color: colors.danger }}>{error}</span>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_PHOTO_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />
    </div>
  );
}

export function AccountView() {
  const raw = localStorage.getItem('candidate_info');
  const info = raw
    ? (JSON.parse(raw) as { email?: string; profile?: { fullName?: string; photoUrl?: string | null; socialName?: string } })
    : {};

  const [config, setConfig] = useState<CandidateAuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(info.profile?.photoUrl ?? null);

  useEffect(() => {
    apiGet<CandidateAuthConfig>('/auth/candidate-auth-config')
      .then((c) => setConfig(c))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const displayName = info.profile?.fullName ?? info.profile?.socialName ?? info.email ?? 'Candidato';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div style={{ maxWidth: 540, margin: '40px auto', padding: `0 ${spacing.md}px`, display: 'grid', gap: spacing.md }}>

      {/* ── Profile card ─────────────────────────────────────────── */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Minha Conta</CardTitle>
          <CardDescription>
            Gerencie sua identidade e segurança no Connekt Hunter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState
              message="Carregando configurações da sua conta..."
              description="Verificando opções de acesso disponíveis para o seu perfil."
              minHeight={200}
            />
          ) : (
            <>
              {/* Avatar upload */}
              <AvatarUpload
                currentPhotoUrl={photoUrl}
                onUploaded={(url) => setPhotoUrl(url)}
              />

              {/* Profile data */}
              <div style={{
                padding: spacing.md,
                background: colors.surfaceAlt,
                borderRadius: radius.lg,
                marginBottom: spacing.lg,
                border: `1px solid ${colors.borderLight}`,
              }}>
                <div style={{ display: 'grid', gap: spacing.xs }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: fontWeight.semibold }}>
                      E-mail
                    </span>
                    <span style={{ fontSize: fontSize.sm, color: colors.text }}>{info.email ?? '—'}</span>
                  </div>
                  <div style={{ height: 1, background: colors.borderLight }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: fontWeight.semibold }}>
                      Nome
                    </span>
                    <span style={{ fontSize: fontSize.sm, color: colors.text }}>{displayName}</span>
                  </div>
                  {info.profile?.photoUrl && (
                    <>
                      <div style={{ height: 1, background: colors.borderLight }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: fontWeight.semibold }}>
                          Foto
                        </span>
                        <span style={{ fontSize: fontSize.xs, color: colors.success }}>✅ Configurada</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {error && <InlineMessage variant="error" style={{ marginBottom: spacing.md }}>{error}</InlineMessage>}

              {/* Social login */}
              <div style={{ marginBottom: spacing.lg }}>
                <h3 style={{ margin: `0 0 ${spacing.xs}px`, color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                  Login Social
                </h3>
                <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.md, margin: `0 0 ${spacing.md}px` }}>
                  Autentique-se com Google ou LinkedIn. Sua senha é gerenciada pelo provedor de identidade — nada é armazenado localmente.
                </p>

                {config?.hostedUiUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    {config.socialProviders.map((provider) => (
                      <Button
                        key={provider}
                        variant="outline"
                        onClick={() => {
                          try {
                            const url = new URL(config.hostedUiUrl!);
                            if (!url.hostname.endsWith('.amazoncognito.com')) {
                              setError('URL do provedor de identidade não é válida.');
                              return;
                            }
                            url.searchParams.set('identity_provider', provider);
                            
                            // Safe-encode token into state to link identity on callback
                            const token = getToken();
                            if (token) {
                              url.searchParams.set('state', btoa(JSON.stringify({ inviteToken: token })));
                            }
                            
                            window.location.href = url.toString();
                          } catch {
                            setError('URL do provedor de identidade não é válida.');
                          }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' }}
                      >
                        <span style={{ fontSize: 18 }}>{SOCIAL_PROVIDER_ICONS[provider] ?? '🔗'}</span>
                        Entrar com {provider}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <InlineMessage variant="info">
                    Login social será habilitado quando o pool Cognito para candidatos for configurado.
                    No ambiente local, o acesso é realizado via token de convite.
                  </InlineMessage>
                )}
              </div>

              {/* Change password */}
              {config?.changePasswordUrl && (
                <div style={{ paddingTop: spacing.md, borderTop: `1px solid ${colors.borderLight}` }}>
                  <h3 style={{ margin: `0 0 ${spacing.xs}px`, color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                    Redefinir Senha
                  </h3>
                  <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.sm }}>
                    A troca de senha é realizada diretamente no provedor de identidade (Cognito).
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      try {
                        const url = new URL(config.changePasswordUrl!);
                        if (!url.hostname.endsWith('.amazoncognito.com')) {
                          setError('URL de alteração de senha não é válida.');
                          return;
                        }
                        window.location.href = url.toString();
                      } catch {
                        setError('URL de alteração de senha não é válida.');
                      }
                    }}
                  >
                    🔑 Alterar senha no provedor
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Avatar fallback preview (when no photo uploaded yet) ──── */}
      {!photoUrl && (
        <div style={{
          padding: spacing.md,
          background: colors.surfaceAlt,
          borderRadius: radius.lg,
          border: `1px dashed ${colors.border}`,
          textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: radius.full,
            background: colors.primary, color: colors.textInverse,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: fontSize.xl, fontWeight: fontWeight.bold,
            margin: '0 auto',
            boxShadow: shadows.sm,
          }}>
            {initials}
          </div>
          <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: fontSize.xs, color: colors.textMuted }}>
            Clique na foto acima para personalizar seu avatar.
          </p>
        </div>
      )}
    </div>
  );
}

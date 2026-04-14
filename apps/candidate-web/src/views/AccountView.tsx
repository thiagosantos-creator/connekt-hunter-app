import { useState, useEffect } from 'react';
import { apiGet } from '../services/api.js';
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
} from '@connekt/ui';

interface CandidateAuthConfig {
  provider: string;
  hostedUiUrl: string | null;
  changePasswordUrl: string | null;
  socialProviders: string[];
}

export function AccountView() {
  const raw = localStorage.getItem('candidate_info');
  const info = raw ? (JSON.parse(raw) as { email?: string; profile?: { fullName?: string } }) : {};

  const [config, setConfig] = useState<CandidateAuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<CandidateAuthConfig>('/auth/candidate-auth-config')
      .then((c) => setConfig(c))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: `0 ${spacing.md}px` }}>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Minha Conta</CardTitle>
          <CardDescription>
            {info.profile?.fullName ?? info.email ?? 'Candidato'} — gerencie seu acesso e segurança.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState
              message="Carregando configurações da sua conta..."
              description="Estamos verificando as opções de acesso e segurança disponíveis para o seu perfil."
              minHeight={220}
            />
          ) : (
            <>
          <div style={{ marginBottom: spacing.lg, padding: spacing.md, background: colors.surfaceAlt, borderRadius: 8 }}>
            <p style={{ margin: 0, color: colors.textSecondary }}>
              <strong>E-mail:</strong> {info.email ?? '—'}
            </p>
            <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.textSecondary }}>
              <strong>Nome:</strong> {info.profile?.fullName ?? '—'}
            </p>
          </div>

          {error && <InlineMessage variant="error">{error}</InlineMessage>}

          <h3 style={{ margin: `0 0 ${spacing.sm}px`, color: colors.text }}>Login Social</h3>
          <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.md }}>
            Autentique-se com sua conta Google ou LinkedIn. Sua senha e segurança são gerenciadas pelo provedor de identidade — nenhuma senha é armazenada localmente.
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
                      if (!url.hostname.endsWith('.amazoncognito.com')) return;
                      url.searchParams.set('identity_provider', provider);
                      window.location.href = url.toString();
                    } catch { /* invalid URL — ignore */ }
                  }}
                >
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

          {config?.changePasswordUrl && (
            <div style={{ marginTop: spacing.lg }}>
              <h3 style={{ margin: `0 0 ${spacing.sm}px`, color: colors.text }}>Trocar Senha</h3>
              <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.sm }}>
                A troca de senha é realizada diretamente pelo provedor de identidade (Cognito).
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    const url = new URL(config.changePasswordUrl!);
                    if (!url.hostname.endsWith('.amazoncognito.com')) return;
                    window.location.href = url.toString();
                  } catch { /* invalid URL — ignore */ }
                }}
              >
                Alterar senha no provedor
              </Button>
            </div>
          )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

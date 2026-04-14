import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setSessionToken } from '../services/api.js';
import { colors, fontSize, fontWeight, spacing } from '@connekt/ui';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface CallbackResult {
  token: string;
  expiresAt: string;
  user: { id: string; email: string; name: string; role: string };
  candidateProfile?: { photoUrl?: string | null; fullName?: string | null };
}

type Phase = 'exchanging' | 'success' | 'error';

export function AuthCallbackView() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('exchanging');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');
    const stateParam = params.get('state');

    if (errorParam) {
      setPhase('error');
      setErrorMsg(errorDesc ?? errorParam);
      return;
    }

    if (!code) {
      setPhase('error');
      setErrorMsg('Código de autorização não encontrado na URL de retorno.');
      return;
    }

    let inviteToken = localStorage.getItem('invite_token') ?? undefined;
    
    // Process state param safely
    if (stateParam) {
      try {
        const decodedStr = atob(stateParam);
        const stateObj = JSON.parse(decodedStr);
        if (stateObj.inviteToken) {
          inviteToken = stateObj.inviteToken;
          // Se recebemos um token novo via state, já fixamos no storage
          localStorage.setItem('invite_token', inviteToken);
        }
      } catch (err) {
        console.warn('Could not parse OAuth state parameter');
      }
    }

    void (async () => {
      try {
        const res = await fetch(`${API}/auth/cognito-callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, inviteToken, state: stateParam }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Erro ${res.status} ao processar o login.`);
        }

        const data = (await res.json()) as CallbackResult;

        // Persist session token for Bearer auth
        setSessionToken(data.token);

        // Update candidate_info with social profile data
        const existingRaw = localStorage.getItem('candidate_info');
        const existing = existingRaw ? (JSON.parse(existingRaw) as Record<string, unknown>) : {};
        const updated = {
          ...existing,
          email: data.user.email,
          profile: {
            ...(typeof existing.profile === 'object' && existing.profile !== null ? existing.profile : {}),
            fullName: data.candidateProfile?.fullName ?? data.user.name ?? (existing.profile as { fullName?: string })?.fullName,
            photoUrl: data.candidateProfile?.photoUrl ?? null,
          },
          sessionExpiresAt: data.expiresAt,
        };
        localStorage.setItem('candidate_info', JSON.stringify(updated));

        setPhase('success');

        // Small delay to show the success state before redirecting
        setTimeout(() => {
          navigate('/status', { replace: true });
        }, 1200);
      } catch (err) {
        setPhase('error');
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
      padding: spacing.xl,
    }}>
      <div style={{
        background: colors.surface,
        borderRadius: 20,
        padding: spacing.xxl,
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {phase === 'exchanging' && (
          <>
            <div style={{ fontSize: 48, marginBottom: spacing.md, animation: 'spin 1.2s linear infinite' }}>⚙️</div>
            <h2 style={{ margin: `0 0 ${spacing.sm}px`, color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>
              Autenticando...
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, margin: 0 }}>
              Verificando seu login com o provedor de identidade. Aguarde um momento.
            </p>
          </>
        )}

        {phase === 'success' && (
          <>
            <div style={{ fontSize: 52, marginBottom: spacing.md }}>✅</div>
            <h2 style={{ margin: `0 0 ${spacing.sm}px`, color: colors.success, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>
              Login realizado!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, margin: 0 }}>
              Redirecionando para o seu portal...
            </p>
          </>
        )}

        {phase === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: spacing.md }}>⚠️</div>
            <h2 style={{ margin: `0 0 ${spacing.sm}px`, color: colors.danger, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>
              Falha no login
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.lg }}>
              {errorMsg || 'Ocorreu um erro inesperado durante a autenticação.'}
            </p>
            <button
              onClick={() => navigate('/account', { replace: true })}
              style={{
                background: colors.primary,
                color: colors.textInverse,
                border: 'none',
                borderRadius: 10,
                padding: `${spacing.sm}px ${spacing.xl}px`,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              ← Tentar novamente
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

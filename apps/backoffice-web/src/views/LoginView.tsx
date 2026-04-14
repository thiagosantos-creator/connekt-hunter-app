import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { AuthUser } from '../services/types.js';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  InlineMessage,
  Spinner,
  colors,
  spacing,
  fontSize,
  fontWeight,
  radius,
} from '@connekt/ui';

function getHomeRoute(role?: string): string {
  if (role === 'admin' || role === 'headhunter') return '/vacancies';
  return '/applications';
}

export function LoginView() {
  const navigate = useNavigate();
  const { user, refreshAuth } = useAuth();
  const [email, setEmail] = useState('headhunter@demo.local');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(getHomeRoute(user.role));
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiPost<{ token: string; user: AuthUser; error?: string }>(
        '/auth/dev-login',
        { email },
      );
      if (data.error) {
        setError(data.error);
        return;
      }
      localStorage.setItem('bo_token', data.token);
      localStorage.setItem('bo_user', JSON.stringify(data.user));
      await refreshAuth();
      navigate(getHomeRoute(data.user.role));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: colors.primary,
      }}
    >
      <Card variant="elevated" style={{ maxWidth: 420, width: '100%' }}>
        <CardHeader>
          <CardTitle>Connekt Hunter</CardTitle>
          <CardDescription>
            Modo desenvolvimento — utilize um e-mail de demonstração.
          </CardDescription>
        </CardHeader>

        <form onSubmit={(e) => { void handleSubmit(e); }}>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <InlineMessage variant="error">{error}</InlineMessage>}
          </CardContent>

          <CardFooter style={{ flexDirection: 'column', gap: spacing.md }}>
            <Button type="submit" disabled={loading} size="lg" style={{ width: '100%' }}>
              {loading ? <><Spinner size={16} /> Entrando…</> : 'Entrar'}
            </Button>
          </CardFooter>
        </form>

        <CardContent>
          <details style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
            <summary
              style={{ cursor: 'pointer', fontWeight: fontWeight.medium, marginBottom: spacing.xs }}
            >
              Contas de demonstração
            </summary>
            <ul
              style={{
                margin: 0,
                paddingLeft: spacing.lg,
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.xs,
              }}
            >
              <li>
                <code
                  style={{
                    background: colors.surface,
                    padding: '2px 6px',
                    borderRadius: radius.sm,
                  }}
                >
                  admin@demo.local
                </code>
              </li>
              <li>
                <code
                  style={{
                    background: colors.surface,
                    padding: '2px 6px',
                    borderRadius: radius.sm,
                  }}
                >
                  headhunter@demo.local
                </code>
              </li>
              <li>
                <code
                  style={{
                    background: colors.surface,
                    padding: '2px 6px',
                    borderRadius: radius.sm,
                  }}
                >
                  client@demo.local
                </code>
              </li>
            </ul>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

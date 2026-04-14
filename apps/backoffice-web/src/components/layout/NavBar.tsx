import React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { colors, fontSize, fontWeight, spacing, zIndex } from '@connekt/ui';
import { useAuth, AuthContext, useAuthProvider } from '../../hooks/useAuth.js';
import { hasPermission } from '../../services/rbac.js';
import { apiPost } from '../../services/api.js';

interface NavSection {
  group?: string;
  items: Array<{ label: string; to: string }>;
}

const navByRole: Record<string, NavSection[]> = {
  admin: [
    {
      items: [
        { label: 'Vagas', to: '/vacancies' },
        { label: 'Candidatos', to: '/candidates' },
        { label: 'Aplicações', to: '/applications' },
        { label: 'Inbox', to: '/inbox' },
      ],
    },
    {
      items: [
        { label: 'Shortlist', to: '/shortlist' },
        { label: 'Revisão Cliente', to: '/client-review' },
        { label: 'Entrevista', to: '/smart-interview' },
        { label: 'Inteligência', to: '/product-intelligence' },
      ],
    },
    {
      items: [
        { label: 'Usuários', to: '/admin/users' },
        { label: 'Empresas', to: '/admin/organizations' },
        { label: 'Políticas', to: '/admin/access-policies' },
        { label: 'Auditoria', to: '/audit' },
        { label: 'Enterprise', to: '/enterprise-governance' },
      ],
    },
    {
      items: [
        { label: 'Notificações', to: '/notifications' },
        { label: 'Conta', to: '/account' },
      ],
    },
  ],
  headhunter: [
    {
      items: [
        { label: 'Vagas', to: '/vacancies' },
        { label: 'Candidatos', to: '/candidates' },
        { label: 'Aplicações', to: '/applications' },
        { label: 'Inbox', to: '/inbox' },
        { label: 'Shortlist', to: '/shortlist' },
        { label: 'Revisão Cliente', to: '/client-review' },
        { label: 'Entrevista', to: '/smart-interview' },
        { label: 'Inteligência', to: '/product-intelligence' },
        { label: 'Enterprise', to: '/enterprise-governance' },
        { label: 'Notificações', to: '/notifications' },
        { label: 'Conta', to: '/account' },
      ],
    },
  ],
  client: [
    {
      items: [
        { label: 'Revisão Cliente', to: '/client-review' },
        { label: 'Aplicações', to: '/applications' },
        { label: 'Notificações', to: '/notifications' },
        { label: 'Conta', to: '/account' },
      ],
    },
  ],
};

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sections = user ? navByRole[user.role] ?? [] : [];
  const allItems = sections.flatMap((s) => s.items);

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      style={{
        background: colors.primary,
        color: colors.textInverse,
        padding: `0 ${spacing.lg}px`,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        height: 48,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        zIndex: zIndex.sticky,
      }}
    >
      <strong style={{ fontSize: fontSize.lg, marginRight: spacing.xl, letterSpacing: -0.3, whiteSpace: 'nowrap' }}>Connekt Hunter</strong>

      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden', flex: 1 }}>
        {sections.map((section, sIdx) => (
          <React.Fragment key={sIdx}>
            {sIdx > 0 && (
              <span
                aria-hidden="true"
                style={{
                  width: 1,
                  height: 20,
                  background: 'rgba(255,255,255,0.2)',
                  margin: `0 ${spacing.xs}px`,
                  flexShrink: 0,
                }}
              />
            )}
            {section.items.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    color: active ? colors.textInverse : 'rgba(255,255,255,0.7)',
                    textDecoration: 'none',
                    fontSize: fontSize.sm,
                    fontWeight: active ? fontWeight.semibold : fontWeight.normal,
                    padding: `${spacing.sm + 4}px ${spacing.sm}px`,
                    borderBottom: active ? '2px solid #fff' : '2px solid transparent',
                    transition: 'color 0.15s, border-color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: spacing.md, flexShrink: 0 }}>
        <span style={{ fontSize: fontSize.sm, opacity: 0.8 }}>
          {user?.name} <span style={{ opacity: 0.6 }}>({user?.role})</span>
        </span>
        <button
          onClick={() => {
            void apiPost('/auth/logout', {})
              .catch(() => null)
              .finally(() => {
                logout();
                navigate('/login');
              });
          }}
          aria-label="Sair da conta"
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            padding: `${spacing.xs}px ${spacing.sm + 4}px`,
            background: 'rgba(255,255,255,0.12)',
            color: colors.textInverse,
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          Sair
        </button>
      </div>
    </nav>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function PermissionRoute({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission: Parameters<typeof hasPermission>[1];
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user, permission)) return <Navigate to="/applications" replace />;
  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

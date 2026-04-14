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
        { label: 'Avaliação do Cliente', to: '/client-review' },
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
      group: 'Pipeline',
      items: [
        { label: 'Vagas', to: '/vacancies' },
        { label: 'Candidatos', to: '/candidates' },
        { label: 'Aplicações', to: '/applications' },
        { label: 'Inbox', to: '/inbox' },
      ],
    },
    {
      group: 'Avaliação',
      items: [
        { label: 'Shortlist', to: '/shortlist' },
        { label: 'Avaliação do Cliente', to: '/client-review' },
        { label: 'Entrevista', to: '/smart-interview' },
        { label: 'Inteligência', to: '/product-intelligence' },
      ],
    },
    {
      group: 'Gestão',
      items: [
        { label: 'Enterprise', to: '/enterprise-governance' },
        { label: 'Notificações', to: '/notifications' },
        { label: 'Conta', to: '/account' },
      ],
    },
  ],
  client: [
    {
      items: [
        { label: 'Avaliação do Cliente', to: '/client-review' },
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

  const userInitials = (user?.name ?? user?.email ?? '?')
    .split(' ').filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

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
        height: 56,
        boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.15)',
        zIndex: zIndex.sticky,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginRight: spacing.xl, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: fontWeight.bold }}>
          C
        </div>
        <strong style={{ fontSize: fontSize.md, letterSpacing: -0.3, whiteSpace: 'nowrap' }}>Connekt Hunter</strong>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden', flex: 1 }}>
        {sections.map((section, sIdx) => (
          <React.Fragment key={sIdx}>
            {sIdx > 0 && (
              <span
                aria-hidden="true"
                style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: `0 ${spacing.xs}px`, flexShrink: 0 }}
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
                    color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                    textDecoration: 'none',
                    fontSize: fontSize.sm,
                    fontWeight: active ? fontWeight.semibold : fontWeight.normal,
                    padding: `${spacing.md + 2}px ${spacing.sm + 2}px`,
                    borderBottom: active ? `2px solid ${colors.accent}` : '2px solid transparent',
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

      {/* User info + logout */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: spacing.sm, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#fff', flexShrink: 0 }}>
            {userInitials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>
              {user?.name ?? user?.email}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize' }}>
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            void apiPost('/auth/logout', {})
              .catch(() => null)
              .finally(() => { logout(); navigate('/login'); });
          }}
          aria-label="Sair da conta"
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            padding: `${spacing.xs}px ${spacing.sm + 4}px`,
            background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.15s',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
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

import React from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, AuthContext, useAuthProvider } from '../../hooks/useAuth.js';
import { colors, fontSize, fontWeight, spacing } from '@connekt/ui';
import { hasPermission } from '../../services/rbac.js';
import { apiPost } from '../../services/api.js';
import { addAuditEvent } from '../../services/account.js';

/* -------------------------------------------------------------------------- */
/*  Nav items per role                                                        */
/* -------------------------------------------------------------------------- */
const navByRole: Record<string, Array<{ label: string; to: string }>> = {
  admin: [
    { label: 'Vagas', to: '/vacancies' },
    { label: 'Candidatos', to: '/candidates' },
    { label: 'Aplicações', to: '/applications' },
    { label: 'Inbox', to: '/inbox' },
    { label: 'Shortlist', to: '/shortlist' },
    { label: 'Revisão Cliente', to: '/client-review' },
    { label: 'Entrevista', to: '/smart-interview' },
    { label: 'Inteligência', to: '/product-intelligence' },
    { label: 'Conta', to: '/account' },
    { label: 'Usuários', to: '/admin/users' },
    { label: 'Empresas', to: '/admin/organizations' },
    { label: 'Políticas', to: '/admin/access-policies' },
    { label: 'Notificações', to: '/notifications' },
    { label: 'Auditoria', to: '/audit' },
    { label: 'Enterprise', to: '/enterprise-governance' },
  ],
  headhunter: [
    { label: 'Vagas', to: '/vacancies' },
    { label: 'Candidatos', to: '/candidates' },
    { label: 'Aplicações', to: '/applications' },
    { label: 'Inbox', to: '/inbox' },
    { label: 'Shortlist', to: '/shortlist' },
    { label: 'Revisão Cliente', to: '/client-review' },
    { label: 'Entrevista', to: '/smart-interview' },
    { label: 'Inteligência', to: '/product-intelligence' },
    { label: 'Conta', to: '/account' },
    { label: 'Notificações', to: '/notifications' },
    { label: 'Enterprise', to: '/enterprise-governance' },
  ],
  client: [
    { label: 'Aplicações', to: '/applications' },
    { label: 'Revisão Cliente', to: '/client-review' },
    { label: 'Conta', to: '/account' },
    { label: 'Notificações', to: '/notifications' },
  ],
};

/* -------------------------------------------------------------------------- */
/*  NavBar                                                                    */
/* -------------------------------------------------------------------------- */
export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = user ? navByRole[user.role] ?? [] : [];

  return (
    <nav
      style={{
        background: colors.primary,
        color: colors.textInverse,
        padding: `0 ${spacing.lg}px`,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        height: 48,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    >
      <strong style={{ fontSize: fontSize.lg, marginRight: spacing.xl, letterSpacing: -0.3 }}>Connekt Hunter</strong>

      {navItems.map((item) => {
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            style={{
              color: active ? colors.textInverse : 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
              fontSize: fontSize.sm,
              fontWeight: active ? fontWeight.semibold : fontWeight.normal,
              padding: `${spacing.sm + 4}px ${spacing.md}px`,
              borderBottom: active ? '2px solid #fff' : '2px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {item.label}
          </Link>
        );
      })}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <span style={{ fontSize: fontSize.sm, opacity: 0.8 }}>
          {user?.name} <span style={{ opacity: 0.6 }}>({user?.role})</span>
        </span>
        <button
          onClick={() => {
            void apiPost('/auth/logout', {})
              .catch(() => null)
              .finally(() => {
                if (user) addAuditEvent('logout', user.email, user.id);
                logout();
                navigate('/login');
              });
          }}
          style={{
            fontSize: fontSize.sm,
            padding: `${spacing.xs}px ${spacing.sm + 4}px`,
            background: 'rgba(255,255,255,0.1)',
            color: colors.textInverse,
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </div>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/*  Auth wrappers                                                             */
/* -------------------------------------------------------------------------- */
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

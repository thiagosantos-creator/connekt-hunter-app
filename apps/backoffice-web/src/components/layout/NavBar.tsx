import React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { colors, fontSize, fontWeight, radius, spacing, zIndex } from '@connekt/ui';
import { useAuth, AuthContext, useAuthProvider } from '../../hooks/useAuth.js';
import { hasPermission } from '../../services/rbac.js';
import { apiPost } from '../../services/api.js';

const navLinksStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', flex: 1,
  scrollbarWidth: 'none', msOverflowStyle: 'none',
};

interface NavSection {
  group?: string;
  items: Array<{ label: string; to: string }>;
}

const navByRole: Record<string, NavSection[]> = {
  admin: [
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
      group: 'Administração',
      items: [
        { label: 'Usuários', to: '/admin/users' },
        { label: 'Empresas', to: '/admin/organizations' },
        { label: 'Políticas', to: '/admin/access-policies' },
        { label: 'Auditoria', to: '/audit' },
        { label: 'Enterprise', to: '/enterprise-governance' },
      ],
    },
    {
      group: 'Conta',
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
        boxShadow: `0 1px 0 ${colors.overlayInverseLight}, 0 2px 8px ${colors.overlayInverseMedium}`,
        zIndex: zIndex.sticky,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginRight: spacing.xl, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: radius.md, background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: fontWeight.bold, color: colors.textInverse }}>
          C
        </div>
        <strong style={{ fontSize: fontSize.md, letterSpacing: -0.3, whiteSpace: 'nowrap' }}>Connekt Hunter</strong>
      </div>

      {/* Nav links */}
      <div style={navLinksStyle}>
        {sections.map((section, sIdx) => (
          <React.Fragment key={sIdx}>
            {sIdx > 0 && (
              <span
                aria-hidden="true"
                style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.25)', margin: `0 ${spacing.xs}px`, flexShrink: 0 }}
              />
            )}
            {section.group && (
              <span
                aria-hidden="true"
                style={{
                  fontSize: 10,
                  fontWeight: fontWeight.bold,
                  color: 'rgba(255,255,255,0.45)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: `0 ${spacing.xs}px`,
                  whiteSpace: 'nowrap',
                  alignSelf: 'center',
                }}
              >
                {section.group}
              </span>
            )}
            {section.items.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className="connekt-nav-link"
                  style={{
                    color: active ? colors.textInverse : 'rgba(255,255,255,0.75)',
                    textDecoration: 'none',
                    fontSize: fontSize.sm,
                    fontWeight: active ? fontWeight.semibold : fontWeight.normal,
                    padding: `${spacing.md + 2}px ${spacing.sm + 2}px`,
                    borderBottom: active ? `2px solid ${colors.accent}` : '2px solid transparent',
                    whiteSpace: 'nowrap',
                    borderRadius: 0,
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
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: colors.overlayMedium, border: `1px solid ${colors.overlayMedium}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textInverse, flexShrink: 0 }}>
            {userInitials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textInverse, lineHeight: 1.2, opacity: 0.9 }}>
              {user?.name ?? user?.email}
            </span>
            <span style={{ fontSize: 11, color: colors.overlayHeavy, textTransform: 'capitalize' }}>
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
          className="connekt-nav-link"
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            padding: `${spacing.xs}px ${spacing.sm + 4}px`,
            background: colors.overlayLight,
            color: colors.textInverse,
            border: `1px solid ${colors.overlayMedium}`,
            borderRadius: radius.sm,
            cursor: 'pointer',
            transition: 'background 0.15s',
            letterSpacing: '0.01em',
            opacity: 0.9,
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = colors.overlayMedium; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = colors.overlayLight; }}
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

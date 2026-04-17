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
        { label: 'Dashboard', to: '/dashboard' },
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
        { label: 'Dashboard', to: '/dashboard' },
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
  const navRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({ opacity: 0 });

  const sections = user ? navByRole[user.role] ?? [] : [];

  const userInitials = (user?.name ?? user?.email ?? '?')
    .split(' ').filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

  // Update indicator position
  React.useEffect(() => {
    const activeLink = navRef.current?.querySelector('[aria-current="page"]') as HTMLElement;
    if (activeLink) {
      setIndicatorStyle({
        width: activeLink.offsetWidth,
        height: activeLink.offsetHeight,
        transform: `translateX(${activeLink.offsetLeft}px)`,
        opacity: 1,
      });
    } else {
      setIndicatorStyle({ opacity: 0 });
    }
  }, [location.pathname, sections]);

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      style={{
        background: 'rgba(2, 6, 23, 0.8)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        color: colors.textInverse,
        padding: `0 ${spacing.xl}px`,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        height: 64,
        boxShadow: shadows.glass,
        zIndex: zIndex.sticky,
        position: 'sticky',
        top: 0,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginRight: spacing.xl, flexShrink: 0 }}>
        <div style={{ 
          width: 32, 
          height: 32, 
          borderRadius: radius.md, 
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.info})`, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: 14, 
          fontWeight: fontWeight.bold, 
          color: colors.textInverse,
          boxShadow: `0 0 15px ${colors.accent}66`
        }}>
          C
        </div>
        <strong style={{ fontSize: fontSize.lg, letterSpacing: -0.8, whiteSpace: 'nowrap', fontWeight: fontWeight.black }}>Connekt</strong>
      </div>

      {/* Nav links with Sliding Indicator */}
      <div ref={navRef} style={{ ...navLinksStyle, position: 'relative' }}>
        {/* The Highlighter Blob */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: radius.md,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
          zIndex: 0,
          ...indicatorStyle
        }} />

        {sections.map((section, sIdx) => (
          <React.Fragment key={sIdx}>
            {sIdx > 0 && (
              <span
                aria-hidden="true"
                style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: `0 ${spacing.sm}px`, flexShrink: 0, zIndex: 1 }}
              />
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
                    color: active ? colors.textInverse : 'rgba(255,255,255,0.55)',
                    textDecoration: 'none',
                    fontSize: fontSize.sm,
                    fontWeight: active ? fontWeight.bold : fontWeight.medium,
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    margin: `0 2px`,
                    borderRadius: radius.md,
                    whiteSpace: 'nowrap',
                    transition: 'color 0.3s ease',
                    zIndex: 1,
                  }}
                  onMouseEnter={(e) => { if (!active) (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.9)'; }}
                  onMouseLeave={(e) => { if (!active) (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}
                >
                  {item.label}
                </Link>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* User info + logout */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: spacing.md, flexShrink: 0 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: spacing.sm, 
          padding: `${spacing.xs}px ${spacing.sm}px`, 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: radius.full, 
          border: '1px solid rgba(255,255,255,0.1)' 
        }}>
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: '50%', 
            background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primaryHover})`, 
            border: '2px solid rgba(255,255,255,0.2)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: 11, 
            fontWeight: fontWeight.bold, 
            color: colors.textInverse, 
            flexShrink: 0 
          }}>
            {userInitials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginRight: spacing.xs }}>
            <span style={{ fontSize: 11, fontWeight: fontWeight.bold, color: colors.textInverse, lineHeight: 1.2 }}>
              {user?.name ?? user?.email?.split('@')[0]}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: fontWeight.bold, letterSpacing: '0.05em' }}>
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
            fontSize: fontSize.xs,
            fontWeight: fontWeight.bold,
            padding: `${spacing.sm}px ${spacing.lg}px`,
            background: colors.danger,
            color: colors.textInverse,
            border: 'none',
            borderRadius: radius.lg,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: `0 4px 12px ${colors.danger}44`,
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = 'translateY(-1px)'; (e.target as HTMLElement).style.filter = 'brightness(1.1)'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'translateY(0)'; (e.target as HTMLElement).style.filter = 'none'; }}
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

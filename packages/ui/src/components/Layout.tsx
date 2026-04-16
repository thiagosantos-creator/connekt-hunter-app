import React from 'react';
import { colors, radius, spacing, fontSize, fontWeight, shadows, zIndex } from '../tokens/tokens.js';

/* -------------------------------------------------------------------------- */
/*  Layout components — AppShell, PageHeader, Sidebar-like nav                */
/* -------------------------------------------------------------------------- */

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg }}>
      <div>
        <h2 style={{ margin: 0, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text }}>{title}</h2>
        {description && <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: fontSize.md, color: colors.textSecondary }}>{description}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: spacing.sm }}>{actions}</div>}
    </div>
  );
}

export function PageContent({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: `${spacing.lg}px ${spacing.xl}px`, maxWidth: 1200, margin: '0 auto', ...style }}>
      {children}
    </div>
  );
}

/** Inline status message (toast-like feedback) */
export type MessageVariant = 'success' | 'error' | 'info' | 'warning';

export function InlineMessage({ children, variant = 'info', onDismiss, style }: { children: React.ReactNode; variant?: MessageVariant; onDismiss?: () => void; style?: React.CSSProperties }) {
  const styleMap: Record<MessageVariant, React.CSSProperties> = {
    success: { background: colors.successLight, color: colors.successDark, borderColor: colors.success },
    error: { background: colors.dangerLight, color: colors.dangerDark, borderColor: colors.danger },
    info: { background: colors.infoLight, color: colors.infoDark, borderColor: colors.info },
    warning: { background: colors.warningLight, color: colors.warningDark, borderColor: colors.warning },
  };
  return (
    <div
      style={{
        padding: `${spacing.sm}px ${spacing.md}px`,
        borderRadius: radius.md,
        fontSize: fontSize.sm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeft: '4px solid',
        marginBottom: spacing.md,
        ...styleMap[variant],
        ...style,
      }}
    >
      <span>{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: fontSize.lg, color: 'inherit', padding: 0 }}>
          ×
        </button>
      )}
    </div>
  );
}

/** Empty state placeholder */
export function EmptyState({ title, description, icon, action }: { title: string; description?: string; icon?: string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: `${spacing.xxl}px ${spacing.lg}px`, color: colors.textMuted }}>
      {icon && <div style={{ fontSize: 48, marginBottom: spacing.md }}>{icon}</div>}
      <h3 style={{ margin: 0, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textSecondary }}>{title}</h3>
      {description && <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: fontSize.md }}>{description}</p>}
      {action && <div style={{ marginTop: spacing.md }}>{action}</div>}
    </div>
  );
}

/** Stat box for dashboards */
export function StatBox({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="stat-box" style={{ padding: spacing.lg, background: colors.surface, border: `1px solid ${colors.borderLight}`, borderRadius: radius.lg, minWidth: 140, boxShadow: shadows.sm, transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${colors.accent}, ${colors.infoLight})`, opacity: 0.8 }} />
      <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: spacing.xs }}>{label}</div>
      <div style={{ fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.text, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{value}</div>
      {subtext && <div style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm }}>{subtext}</div>}
    </div>
  );
}

/** Section divider */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, margin: `${spacing.lg}px 0 ${spacing.md}px`, paddingBottom: spacing.sm, borderBottom: `1px solid ${colors.borderLight}` }}>
      {children}
    </h3>
  );
}

/** AI tag provenance */
export function AiTag() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: fontSize.xs, color: colors.infoDark, fontWeight: fontWeight.medium }}>
      🤖 Assistido por IA
    </span>
  );
}

/** Loading spinner */
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.lg }}>
      <div
        style={{
          width: size,
          height: size,
          border: `3px solid ${colors.border}`,
          borderTopColor: colors.primary,
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
    </div>
  );
}

export function LoadingState({ message = 'Carregando informações...', description, size = 28, minHeight = 160 }: { message?: string; description?: string; size?: number; minHeight?: number }) {
  return (
    <div
      style={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: spacing.xs,
        padding: spacing.lg,
      }}
    >
      <Spinner size={size} />
      <p style={{ margin: 0, color: colors.textSecondary, fontSize: fontSize.md }}>{message}</p>
      {description && <p style={{ margin: 0, color: colors.textMuted, fontSize: fontSize.sm, maxWidth: 520 }}>{description}</p>}
    </div>
  );
}

/** Skeleton loading placeholder */
export function Skeleton({ width, height = 16, borderRadius, style }: { width?: string | number; height?: number; borderRadius?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: width ?? '100%',
        height,
        borderRadius: borderRadius ?? radius.md,
        background: `linear-gradient(90deg, ${colors.borderLight} 25%, ${colors.surfaceHover} 50%, ${colors.borderLight} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function FormSkeleton({ rows = 6, itemHeight = 32 }: { rows?: number; itemHeight?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={itemHeight} borderRadius={radius.sm} />
      ))}
    </div>
  );
}

/** Skeleton for table rows */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, padding: spacing.md }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: spacing.md }}>
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} height={14} style={{ flex: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Toast notification (auto-dismissing) */
export interface ToastItem {
  id: string;
  message: string;
  variant: MessageVariant;
}

export function Toast({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div style={{ position: 'fixed', top: spacing.lg, right: spacing.lg, zIndex: zIndex.toast, display: 'flex', flexDirection: 'column', gap: spacing.sm, maxWidth: 400 }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            padding: `${spacing.sm + 2}px ${spacing.md}px`,
            borderRadius: radius.md,
            fontSize: fontSize.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
            boxShadow: shadows.lg,
            animation: 'slideIn 0.25s ease',
            ...(item.variant === 'success' ? { background: colors.successLight, color: colors.successDark } : {}),
            ...(item.variant === 'error' ? { background: colors.dangerLight, color: colors.dangerDark } : {}),
            ...(item.variant === 'info' ? { background: colors.infoLight, color: colors.infoDark } : {}),
            ...(item.variant === 'warning' ? { background: colors.warningLight, color: colors.warningDark } : {}),
          }}
        >
          <span>{item.message}</span>
          <button onClick={() => onDismiss(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: fontSize.lg, color: 'inherit', padding: 0, lineHeight: 1 }}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/** Tabs component */
export interface Tab {
  key: string;
  label: string;
  badge?: string | number;
}

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return (
    <div role="tablist" aria-label="Abas de navegação" style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${colors.borderLight}`, marginBottom: spacing.lg }}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.key}`}
            id={`tab-${tab.key}`}
            onClick={() => onChange(tab.key)}
            style={{
              padding: `${spacing.sm + 2}px ${spacing.md}px`,
              fontSize: fontSize.sm,
              fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
              color: isActive ? colors.accentDark : colors.textSecondary,
              background: 'none',
              border: 'none',
              borderBottom: isActive ? `2px solid ${colors.accent}` : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -2,
              transition: 'color 0.15s, border-color 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span style={{ fontSize: fontSize.xs, background: isActive ? colors.accent : colors.border, color: isActive ? colors.textInverse : colors.textSecondary, padding: '1px 6px', borderRadius: radius.full, fontWeight: fontWeight.medium }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Step indicator with timeline visual */
export function StepTimeline({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: spacing.lg }}>
      {steps.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs, flex: 1 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.full,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  background: isDone ? colors.success : isActive ? colors.accent : colors.surfaceAlt,
                  color: isDone || isActive ? colors.textInverse : colors.textMuted,
                  border: `2px solid ${isDone ? colors.success : isActive ? colors.accent : colors.border}`,
                  transition: 'all 0.2s',
                }}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: fontSize.xs, color: isActive ? colors.text : colors.textMuted, fontWeight: isActive ? fontWeight.medium : fontWeight.normal, textAlign: 'center', maxWidth: 80 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: isDone ? colors.success : colors.borderLight, marginBottom: spacing.lg, transition: 'background 0.2s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** Global CSS injection (call once at root) */
export function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      *, *::before, *::after { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: ${colors.text};
        background: ${colors.surfaceAlt};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        line-height: 1.5;
      }
      a { color: ${colors.accent}; text-decoration: none; transition: color 0.15s ease; }
      a:hover { color: ${colors.accentHover}; text-decoration: none; }

      /* ─── Focus-visible utility: all interactive elements ─── */
      a:focus-visible,
      button:focus-visible,
      [tabindex]:focus-visible {
        outline: 2px solid ${colors.accent};
        outline-offset: 2px;
      }

      /* ─── Nav link utilities (dark bg) ─── */
      .connekt-nav-link {
        transition: color 0.15s, border-color 0.15s, background 0.15s;
      }
      .connekt-nav-link:hover {
        color: ${colors.textInverse} !important;
        background: ${colors.overlayLight};
      }
      .connekt-nav-link:focus-visible {
        outline: 2px solid ${colors.accent};
        outline-offset: -2px;
      }

      /* ─── Glassmorphism utility classes ─── */
      .glass-panel {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.4);
        box-shadow: ${shadows.glass};
      }
        
      /* ─── Component utilities ─── */
      .stat-box:hover {
        transform: translateY(-2px);
        box-shadow: ${shadows.md};
        border-color: ${colors.border};
      }
      
      .hover-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      }
      .hover-card:hover {
        transform: translateY(-4px);
        box-shadow: ${shadows.lg};
        border-color: ${colors.border};
      }

      /* ─── Motion preferences ─── */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* ─── High-contrast preferences ─── */
      @media (prefers-contrast: more) {
        body { background: #ffffff; color: #000000; }
        a { color: #0000cc; }
        a:hover { color: #000080; }
        button, input, select, textarea {
          border-color: #000000 !important;
          outline-color: #000000 !important;
        }
      }
    `}</style>
  );
}

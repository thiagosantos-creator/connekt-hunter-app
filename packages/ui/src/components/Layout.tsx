import React from 'react';
import { colors, radius, spacing, fontSize, fontWeight, shadows } from '../tokens/tokens.js';

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

export function InlineMessage({ children, variant = 'info', onDismiss }: { children: React.ReactNode; variant?: MessageVariant; onDismiss?: () => void }) {
  const styleMap: Record<MessageVariant, React.CSSProperties> = {
    success: { background: colors.successLight, color: colors.success, borderColor: colors.success },
    error: { background: colors.dangerLight, color: colors.danger, borderColor: colors.danger },
    info: { background: colors.infoLight, color: colors.info, borderColor: colors.info },
    warning: { background: colors.warningLight, color: colors.warning, borderColor: colors.warning },
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
    <div style={{ padding: spacing.md, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, minWidth: 140 }}>
      <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>{label}</div>
      <div style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text }}>{value}</div>
      {subtext && <div style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>{subtext}</div>}
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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: fontSize.xs, color: colors.info, fontWeight: fontWeight.medium }}>
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

/** Global CSS injection (call once at root) */
export function GlobalStyles() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      *, *::before, *::after { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: ${colors.text};
        background: ${colors.surfaceAlt};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      a { color: ${colors.accent}; text-decoration: none; }
      a:hover { text-decoration: underline; }
    `}</style>
  );
}

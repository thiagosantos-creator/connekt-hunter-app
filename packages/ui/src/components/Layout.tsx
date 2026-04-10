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
    <div style={{ position: 'fixed', top: spacing.lg, right: spacing.lg, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: spacing.sm, maxWidth: 400 }}>
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
            ...(item.variant === 'success' ? { background: colors.successLight, color: colors.success } : {}),
            ...(item.variant === 'error' ? { background: colors.dangerLight, color: colors.danger } : {}),
            ...(item.variant === 'info' ? { background: colors.infoLight, color: colors.info } : {}),
            ...(item.variant === 'warning' ? { background: colors.warningLight, color: colors.warning } : {}),
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
    <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${colors.borderLight}`, marginBottom: spacing.lg }}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: `${spacing.sm + 2}px ${spacing.md}px`,
              fontSize: fontSize.sm,
              fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
              color: isActive ? colors.accent : colors.textSecondary,
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
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
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

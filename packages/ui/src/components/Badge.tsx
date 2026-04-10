import React from 'react';
import { colors, radius, fontSize, fontWeight, spacing } from '../tokens/tokens.js';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: { background: colors.successLight, color: colors.success },
  warning: { background: colors.warningLight, color: colors.warning },
  danger: { background: colors.dangerLight, color: colors.danger },
  info: { background: colors.infoLight, color: colors.info },
  neutral: { background: colors.surfaceAlt, color: colors.textSecondary },
  primary: { background: colors.primaryLight, color: colors.textInverse },
};

export function Badge({ children, variant = 'neutral', size = 'sm', style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: size === 'sm' ? `2px ${spacing.sm}px` : `${spacing.xs}px ${spacing.sm + 4}px`,
        borderRadius: radius.full,
        fontSize: size === 'sm' ? fontSize.xs : fontSize.sm,
        fontWeight: fontWeight.medium,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** Status pill for application statuses */
export function StatusPill({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    submitted: 'neutral',
    shortlisted: 'info',
    approved: 'success',
    rejected: 'danger',
    hold: 'warning',
    completed: 'success',
    in_progress: 'info',
    draft: 'neutral',
    reviewed: 'success',
  };
  return <Badge variant={map[status] ?? 'neutral'}>{status}</Badge>;
}

/** Risk badge */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export function RiskBadge({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, { variant: BadgeVariant; emoji: string }> = {
    low: { variant: 'success', emoji: '🟢' },
    medium: { variant: 'warning', emoji: '🟡' },
    high: { variant: 'danger', emoji: '🟠' },
    critical: { variant: 'danger', emoji: '🔴' },
  };
  const cfg = map[level] ?? map.medium;
  return <Badge variant={cfg.variant}>{cfg.emoji} {level}</Badge>;
}

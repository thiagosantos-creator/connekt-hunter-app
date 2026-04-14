import React from 'react';
import { colors, radius, spacing, shadows, fontSize, fontWeight } from '../tokens/tokens.js';

export interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  variant?: 'default' | 'outlined' | 'elevated';
  className?: string;
}

const variantMap: Record<string, React.CSSProperties> = {
  default: { background: colors.surface, border: `1px solid ${colors.borderLight}`, boxShadow: shadows.sm },
  outlined: { background: 'transparent', border: `1px solid ${colors.border}` },
  elevated: { background: colors.surface, border: `1px solid ${colors.borderLight}`, boxShadow: shadows.xl },
};

export function Card({ children, style, variant = 'default', className = '' }: CardProps) {
  return (
    <div className={className} style={{ borderRadius: radius.xl, padding: spacing.lg, transition: 'all 0.2s ease', ...variantMap[variant], ...style }}>
      {children}
    </div>
  );
}

export function CardHeader({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottom: `1px solid ${colors.borderLight}`, ...style }}>
      {children}
    </div>
  );
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h3 style={{ margin: 0, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, ...style }}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: fontSize.sm, color: colors.textSecondary, ...style }}>
      {children}
    </p>
  );
}

export function CardContent({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}>{children}</div>;
}

export function CardFooter({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginTop: spacing.md, paddingTop: spacing.sm, borderTop: `1px solid ${colors.borderLight}`, display: 'flex', gap: spacing.sm, alignItems: 'center', ...style }}>
      {children}
    </div>
  );
}

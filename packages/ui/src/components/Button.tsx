import React from 'react';
import { colors, radius, fontSize, fontWeight, spacing } from '../tokens/tokens.js';
import { useInjectStyle } from './useInjectStyle.js';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: colors.accent, color: colors.textInverse, border: 'none' },
  secondary: { background: colors.surfaceAlt, color: colors.text, border: `1px solid ${colors.border}` },
  danger: { background: colors.danger, color: colors.textInverse, border: 'none' },
  ghost: { background: 'transparent', color: colors.textSecondary, border: 'none' },
  outline: { background: 'transparent', color: colors.accent, border: `1px solid ${colors.border}` },
  success: { background: colors.success, color: colors.textInverse, border: 'none' },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: `${spacing.xs + 2}px ${spacing.sm + 4}px`, fontSize: fontSize.sm, borderRadius: radius.md },
  md: { padding: `${spacing.sm + 2}px ${spacing.md + 4}px`, fontSize: fontSize.md, borderRadius: radius.lg },
  lg: { padding: `${spacing.sm + 4}px ${spacing.xl}px`, fontSize: fontSize.lg, borderRadius: radius.lg },
};

const buttonFocusStyles = `
  .connekt-ui-button:focus-visible {
    outline: 2px solid ${colors.info};
    outline-offset: 2px;
  }
  .connekt-ui-button:not(:disabled):hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .connekt-ui-button {
    transition: all 0.15s ease;
  }
`;

export function Button({ variant = 'primary', size = 'md', loading, children, disabled, style, className, ...props }: ButtonProps) {
  useInjectStyle('button-focus-styles', buttonFocusStyles);

  return (
    <button
      disabled={disabled || loading}
      className={['connekt-ui-button', className].filter((value): value is string => Boolean(value && value.trim())).join(' ')}
      style={{
        borderRadius: radius.lg,
        fontWeight: fontWeight.medium,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.sm,
        lineHeight: 1.4,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {loading && <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
      {children}
    </button>
  );
}

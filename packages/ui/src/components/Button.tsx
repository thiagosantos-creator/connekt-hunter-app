import React from 'react';
import { colors, radius, fontSize, fontWeight, spacing } from '../tokens/tokens.js';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: colors.primary, color: colors.textInverse, border: 'none' },
  secondary: { background: colors.surfaceAlt, color: colors.text, border: `1px solid ${colors.border}` },
  danger: { background: colors.danger, color: colors.textInverse, border: 'none' },
  ghost: { background: 'transparent', color: colors.textSecondary, border: 'none' },
  outline: { background: 'transparent', color: colors.primary, border: `1px solid ${colors.border}` },
  success: { background: colors.success, color: colors.textInverse, border: 'none' },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: `${spacing.xs}px ${spacing.sm}px`, fontSize: fontSize.sm },
  md: { padding: `${spacing.sm}px ${spacing.md}px`, fontSize: fontSize.md },
  lg: { padding: `${spacing.sm + 2}px ${spacing.lg}px`, fontSize: fontSize.lg },
};

const buttonFocusStyles = `
  .connekt-ui-button:focus-visible {
    outline: 2px solid ${colors.info};
    outline-offset: 2px;
  }
`;

export function Button({ variant = 'primary', size = 'md', loading, children, disabled, style, className, ...props }: ButtonProps) {
  return (
    <>
      <style>{buttonFocusStyles}</style>
      <button
        disabled={disabled || loading}
        className={['connekt-ui-button', className].filter(Boolean).join(' ')}
        style={{
          borderRadius: radius.md,
          fontWeight: fontWeight.medium,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled || loading ? 0.6 : 1,
          transition: 'opacity 0.15s, background 0.15s',
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
    </>
  );
}

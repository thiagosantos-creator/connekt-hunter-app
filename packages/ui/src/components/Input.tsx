import React from 'react';
import { colors, radius, fontSize, spacing } from '../tokens/tokens.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: `${spacing.sm}px ${spacing.sm + 4}px`,
  fontSize: fontSize.md,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
  lineHeight: 1.5,
  color: colors.text,
  background: colors.surface,
};

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <div style={{ marginBottom: spacing.md }}>
      {label && (
        <label style={{ display: 'block', marginBottom: spacing.xs, fontSize: fontSize.sm, fontWeight: 500, color: colors.textSecondary }}>
          {label}
        </label>
      )}
      <input style={{ ...inputStyle, ...(error ? { borderColor: colors.danger } : {}), ...style }} {...props} />
      {error && <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: fontSize.xs, color: colors.danger }}>{error}</p>}
    </div>
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, style, ...props }: TextareaProps) {
  return (
    <div style={{ marginBottom: spacing.md }}>
      {label && (
        <label style={{ display: 'block', marginBottom: spacing.xs, fontSize: fontSize.sm, fontWeight: 500, color: colors.textSecondary }}>
          {label}
        </label>
      )}
      <textarea
        style={{
          ...inputStyle,
          resize: 'vertical',
          minHeight: 80,
          ...(error ? { borderColor: colors.danger } : {}),
          ...style,
        }}
        {...props}
      />
      {error && <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: fontSize.xs, color: colors.danger }}>{error}</p>}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ label, error, style, options, placeholder, ...props }: SelectProps) {
  return (
    <div style={{ marginBottom: spacing.md }}>
      {label && (
        <label style={{ display: 'block', marginBottom: spacing.xs, fontSize: fontSize.sm, fontWeight: 500, color: colors.textSecondary }}>
          {label}
        </label>
      )}
      <select style={{ ...inputStyle, ...(error ? { borderColor: colors.danger } : {}), ...style }} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: fontSize.xs, color: colors.danger }}>{error}</p>}
    </div>
  );
}

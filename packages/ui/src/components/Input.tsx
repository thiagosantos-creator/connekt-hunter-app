import React from 'react';
import { colors, radius, fontSize, spacing, fontWeight } from '../tokens/tokens.js';

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

/* ───── Checkbox ───── */

export interface CheckboxProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

let checkboxCounter = 0;

export function Checkbox({ label, description, checked, onChange, disabled, id }: CheckboxProps) {
  const uid = id ?? `cb-${++checkboxCounter}`;
  return (
    <label
      htmlFor={uid}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.sm,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        padding: `${spacing.xs}px 0`,
      }}
    >
      <input
        type="checkbox"
        id={uid}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{
          width: 18,
          height: 18,
          margin: 0,
          marginTop: 1,
          accentColor: colors.primary,
          cursor: disabled ? 'not-allowed' : 'pointer',
          flexShrink: 0,
        }}
        aria-checked={checked}
      />
      <span>
        <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text }}>{label}</span>
        {description && (
          <span style={{ display: 'block', fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 }}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

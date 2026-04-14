import React, { useId } from 'react';
import { colors, radius, fontSize, spacing, fontWeight } from '../tokens/tokens.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: `${spacing.sm}px ${spacing.sm + 4}px`,
  fontSize: fontSize.md,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
  lineHeight: 1.5,
  color: colors.text,
  background: colors.surface,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: spacing.xs,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.textSecondary,
};

const hintStyle: React.CSSProperties = {
  margin: `${spacing.xs}px 0 0`,
  fontSize: fontSize.xs,
  color: colors.textMuted,
};

const controlFocusStyles = `
  .connekt-field-control:focus-visible {
    border-color: ${colors.info};
    box-shadow: 0 0 0 3px ${colors.infoLight};
    outline: none;
  }
`;

function buildDescribedBy(ids: Array<string | undefined>, current?: string) {
  return [current, ...ids].filter(Boolean).join(' ') || undefined;
}

function FieldLabel({ label, required, htmlFor }: { label?: string; required?: boolean; htmlFor: string }) {
  if (!label) return null;
  return (
    <label htmlFor={htmlFor} style={labelStyle}>
      {label}
      {required && (
        <span aria-hidden="true" style={{ color: colors.danger, marginLeft: spacing.xs }}>
          *
        </span>
      )}
    </label>
  );
}

export function Input({ label, error, hint, style, id, className, required, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = buildDescribedBy([hintId, errorId], props['aria-describedby']);

  return (
    <div style={{ marginBottom: spacing.md }}>
      <style>{controlFocusStyles}</style>
      <FieldLabel label={label} required={required} htmlFor={inputId} />
      <input
        id={inputId}
        className={['connekt-field-control', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
        required={required}
        style={{ ...inputStyle, ...(error ? { borderColor: colors.danger } : {}), ...style }}
        {...props}
      />
      {hint && !error && <p id={hintId} style={hintStyle}>{hint}</p>}
      {error && <p id={errorId} style={{ margin: `${spacing.xs}px 0 0`, fontSize: fontSize.xs, color: colors.danger }}>{error}</p>}
    </div>
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, style, id, className, required, ...props }: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = buildDescribedBy([hintId, errorId], props['aria-describedby']);

  return (
    <div style={{ marginBottom: spacing.md }}>
      <style>{controlFocusStyles}</style>
      <FieldLabel label={label} required={required} htmlFor={inputId} />
      <textarea
        id={inputId}
        className={['connekt-field-control', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
        required={required}
        style={{
          ...inputStyle,
          resize: 'vertical',
          minHeight: 80,
          ...(error ? { borderColor: colors.danger } : {}),
          ...style,
        }}
        {...props}
      />
      {hint && !error && <p id={hintId} style={hintStyle}>{hint}</p>}
      {error && <p id={errorId} style={{ margin: `${spacing.xs}px 0 0`, fontSize: fontSize.xs, color: colors.danger }}>{error}</p>}
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
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ label, error, hint, style, options, placeholder, id, className, required, ...props }: SelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = buildDescribedBy([hintId, errorId], props['aria-describedby']);

  return (
    <div style={{ marginBottom: spacing.md }}>
      <style>{controlFocusStyles}</style>
      <FieldLabel label={label} required={required} htmlFor={inputId} />
      <select
        id={inputId}
        className={['connekt-field-control', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
        required={required}
        style={{ ...inputStyle, ...(error ? { borderColor: colors.danger } : {}), ...style }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error && <p id={hintId} style={hintStyle}>{hint}</p>}
      {error && <p id={errorId} style={{ margin: `${spacing.xs}px 0 0`, fontSize: fontSize.xs, color: colors.danger }}>{error}</p>}
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

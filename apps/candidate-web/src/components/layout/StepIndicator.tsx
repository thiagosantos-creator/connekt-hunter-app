import React from 'react';
import { colors, spacing, fontSize, fontWeight, radius } from '@connekt/ui';

/** Premium step indicator for candidate onboarding */
export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Dados Básicos' },
    { n: 2, label: 'LGPD / Termos' },
    { n: 3, label: 'Upload CV' },
  ];

  return (
    <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.lg, alignItems: 'center' }}>
      {steps.map((step, i) => {
        const isActive = step.n === current;
        const isDone = step.n < current;
        return (
          <React.Fragment key={step.n}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.full,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? colors.primary : isDone ? colors.success : colors.border,
                  color: isActive || isDone ? colors.textInverse : colors.textMuted,
                  fontWeight: fontWeight.bold,
                  fontSize: fontSize.sm,
                  transition: 'background 0.2s',
                }}
              >
                {isDone ? '✓' : step.n}
              </span>
              <span
                style={{
                  fontSize: fontSize.sm,
                  fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
                  color: isActive ? colors.text : isDone ? colors.success : colors.textMuted,
                }}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: isDone ? colors.success : colors.border, borderRadius: radius.full, transition: 'background 0.2s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

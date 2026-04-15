import React from 'react';
import { colors, spacing, fontSize, fontWeight, radius } from '@connekt/ui';

/** Premium step indicator for candidate onboarding — 5 steps */
export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 | 5 }) {
  const steps = [
    { n: 1, label: 'Dados Básicos' },
    { n: 2, label: 'LGPD / Termos' },
    { n: 3, label: 'Upload CV' },
    { n: 4, label: 'Preferências' },
    { n: 5, label: 'Vídeo Intro' },
  ];

  return (
    <div style={{ display: 'flex', gap: spacing.xs, marginBottom: spacing.lg, alignItems: 'center' }}>
      {steps.map((step, i) => {
        const isActive = step.n === current;
        const isDone = step.n < current;
        return (
          <React.Fragment key={step.n}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.full,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? colors.accent : isDone ? colors.success : colors.surfaceHover,
                  color: isActive || isDone ? colors.textInverse : colors.textSecondary,
                  border: !isActive && !isDone ? `2px solid ${colors.border}` : 'none',
                  fontWeight: fontWeight.bold,
                  fontSize: fontSize.xs,
                  transition: 'background 0.2s',
                  flexShrink: 0,
                  boxShadow: isActive ? `0 0 0 4px ${colors.infoLight}` : 'none',
                }}
              >
                {isDone ? '✓' : step.n}
              </span>
              <span
                style={{
                  fontSize: fontSize.xs,
                  fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
                  color: isActive ? colors.accent : isDone ? colors.successDark : colors.textSecondary,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  maxWidth: 68,
                  lineHeight: 1.2,
                }}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: isDone ? colors.success : colors.border,
                  borderRadius: radius.full,
                  transition: 'background 0.3s',
                  marginBottom: spacing.lg,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

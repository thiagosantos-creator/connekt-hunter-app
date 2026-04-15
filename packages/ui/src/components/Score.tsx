import React from 'react';
import { colors, radius, spacing, fontSize, fontWeight } from '../tokens/tokens.js';

/* -------------------------------------------------------------------------- */
/*  Score visualisation components                                            */
/* -------------------------------------------------------------------------- */

export interface ScoreBarProps {
  value: number; // 0–100
  label?: string;
  color?: string;
  height?: number;
}

export function ScoreBar({ value, label, color = colors.accent, height = 8 }: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div style={{ marginBottom: spacing.sm }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{label}</span>
          <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text }}>{Math.round(clamped)}%</span>
        </div>
      )}
      <div style={{ width: '100%', height, background: colors.borderLight, borderRadius: radius.full, overflow: 'hidden' }}>
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            background: color,
            borderRadius: radius.full,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

/** Circular score gauge */
export interface ScoreGaugeProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function ScoreGauge({ value, size = 80, strokeWidth = 6, label }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  const gaugeColor = clamped >= 80 ? colors.success : clamped >= 60 ? colors.warning : colors.danger;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.borderLight} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.25} fontWeight={fontWeight.bold} fill={colors.text}>
          {Math.round(clamped)}%
        </text>
      </svg>
      {label && <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{label}</span>}
    </div>
  );
}

/** Multi-dimension score card */
export interface ScoreDimension {
  label: string;
  value: number;
  color?: string;
}

export interface ScoreCardProps {
  overallScore: number;
  dimensions: ScoreDimension[];
  title?: string;
  aiSummary?: string;
}

export function ScoreCard({ overallScore, dimensions, title, aiSummary }: ScoreCardProps) {
  return (
    <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'flex-start' }}>
      <ScoreGauge value={overallScore} label={title ?? 'Score'} />
      <div style={{ flex: 1 }}>
        {dimensions.map((d) => (
          <ScoreBar key={d.label} value={d.value} label={d.label} color={d.color} />
        ))}
        {aiSummary && (
          <div style={{ marginTop: spacing.sm, padding: spacing.sm, background: colors.infoLight, borderRadius: radius.md, fontSize: fontSize.sm, color: colors.infoDark }}>
            🤖 <em>{aiSummary}</em>
          </div>
        )}
      </div>
    </div>
  );
}

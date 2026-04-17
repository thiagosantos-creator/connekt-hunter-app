/** Connekt Hunter — Design Tokens (premium enterprise palette) */

export const colors = {
  /** Brand */
  primary: '#020617', // Slate 950 (Deeper, more premium)
  primaryLight: '#0f172a', // Slate 900
  primaryHover: '#000000',
  
  /** Accent — Electric and vibrant */
  accent: '#3b82f6',     // Blue 500
  accentHover: '#60a5fa', // Blue 400
  accentLight: '#eff6ff', // Blue 50
  accentDark: '#2563eb',  // Blue 600
  accentGlow: 'rgba(59, 130, 246, 0.4)',

  /** Semantic */
  success: '#10b981', // Emerald 500
  successDark: '#014737',
  successLight: '#ecfdf5',
  warning: '#f59e0b', // Amber 500
  warningDark: '#78350f',
  warningLight: '#fffbeb',
  danger: '#ef4444', // Red 500
  dangerDark: '#7f1d1d',
  dangerLight: '#fef2f2',

  /** Info */
  info: '#06b6d4',     // Cyan 500
  infoDark: '#155e75',
  infoLight: '#ecfeff',

  /** Surface */
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  surfaceHover: '#f1f5f9',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  /** Text */
  text: '#020617', // Slate 950
  textSecondary: '#475569', // Slate 600
  textMuted: '#94a3b8', // Slate 400
  textDisabled: '#cbd5e1',
  textInverse: '#ffffff',

  /** Overlay / glass */
  overlayLight: 'rgba(255,255,255,0.4)',
  overlayMedium: 'rgba(255,255,255,0.7)',
  overlayHeavy: 'rgba(255,255,255,0.9)',
  overlayInverseLight: 'rgba(0,0,0,0.05)',
  overlayInverseMedium: 'rgba(0,0,0,0.1)',
  overlayInverseHeavy: 'rgba(0,0,0,0.4)',
  
  /** Depth */
  glass: 'rgba(255, 255, 255, 0.7)',
  glassDark: 'rgba(15, 23, 42, 0.8)',
} as const;

export const gradients = {
  primary: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
  accent: `linear-gradient(135deg, ${colors.accent}, ${colors.info})`,
  accentLight: `linear-gradient(135deg, ${colors.accentLight}, #ffffff)`,
  glass: `linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))`,
  mesh: `radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0, transparent 50%),
         radial-gradient(at 100% 0%, rgba(6, 182, 212, 0.15) 0, transparent 50%),
         radial-gradient(at 50% 100%, rgba(255, 255, 255, 0.05) 0, transparent 50%)`,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 34,
  display: 48,
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 800,
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
  xl: '0 25px 50px -12px rgb(0 0 0 / 0.12)',
  glow: '0 0 20px rgba(59, 130, 246, 0.2)',
  glass: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 500,
  modal: 1000,
  toast: 1100,
  tooltip: 1200,
} as const;

export const tokens = { colors, gradients, spacing, radius, fontSize, fontWeight, shadows, zIndex } as const;

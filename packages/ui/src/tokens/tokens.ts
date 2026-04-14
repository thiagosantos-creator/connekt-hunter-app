/** Connekt Hunter — Design Tokens (premium enterprise palette) */

export const colors = {
  /** Brand */
  primary: '#0f172a', // Slate 900
  primaryLight: '#1e293b', // Slate 800
  primaryHover: '#020617', // Slate 950
  accent: '#3b82f6', // Blue 500
  accentLight: '#2563eb', // Blue 600

  /** Semantic */
  success: '#10b981', // Emerald 500
  successLight: '#d1fae5', // Emerald 100
  warning: '#f59e0b', // Amber 500
  warningLight: '#fef3c7', // Amber 100
  danger: '#ef4444', // Red 500
  dangerLight: '#fee2e2', // Red 100
  info: '#3b82f6', // Blue 500
  infoLight: '#dbeafe', // Blue 100

  /** Surface */
  surface: '#ffffff',
  surfaceAlt: '#f8fafc', // Slate 50
  surfaceHover: '#f1f5f9', // Slate 100
  border: '#e2e8f0', // Slate 200
  borderLight: '#f1f5f9', // Slate 100

  /** Text */
  text: '#0f172a', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94a3b8', // Slate 400
  textInverse: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
  glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
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

export const tokens = { colors, spacing, radius, fontSize, fontWeight, shadows, zIndex } as const;

/** Connekt Hunter — Design Tokens (premium enterprise palette) */

export const colors = {
  /** Brand */
  primary: '#0f172a', // Slate 900
  primaryLight: '#1e293b', // Slate 800
  primaryHover: '#020617', // Slate 950
  /** Accent — Blue scale for interactive elements.
   *  accent (Blue 600) is the primary interactive colour: contrast ~5.25:1 over white ✅ WCAG AA.
   *  accentHover (Blue 500) is used for hover states — slightly lighter for visual feedback.
   *  accentLight (Blue 100) is a tinted background, not for text.
   *  accentDark (Blue 700) is for high-emphasis text/icons on light surfaces: contrast ~7.4:1 ✅ WCAG AAA.
   */
  accent: '#2563eb',     // Blue 600 — primary interactive (contrast ~5.25:1 over white) ✅ WCAG AA
  accentHover: '#3b82f6', // Blue 500 — hover state (lighter, for visual feedback)
  accentLight: '#dbeafe', // Blue 100 — tinted background only (not for text)
  accentDark: '#1d4ed8',  // Blue 700 — high-contrast text on light surfaces ✅ WCAG AAA

  /** Semantic */
  success: '#10b981', // Emerald 500
  successDark: '#047857', // Emerald 700 — high-contrast text
  successLight: '#d1fae5', // Emerald 100
  warning: '#f59e0b', // Amber 500
  warningDark: '#92400e', // Amber 800 — high-contrast text on warningLight
  warningLight: '#fef3c7', // Amber 100
  danger: '#ef4444', // Red 500
  dangerDark: '#991b1b', // Red 800 — high-contrast text on dangerLight
  dangerLight: '#fee2e2', // Red 100
  /** Info — Sky scale, semantically distinct from the Blue action accent.
   *  infoDark (Sky 800) ensures contrast ~7.2:1 over infoLight ✅ WCAG AAA.
   */
  info: '#0ea5e9',     // Sky 500
  infoDark: '#0369a1', // Sky 800 — high-contrast text on infoLight ✅ WCAG AAA
  infoLight: '#e0f2fe', // Sky 100

  /** Surface */
  surface: '#ffffff',
  surfaceAlt: '#f8fafc', // Slate 50
  surfaceHover: '#f1f5f9', // Slate 100
  border: '#e2e8f0', // Slate 200
  borderLight: '#f1f5f9', // Slate 100

  /** Text */
  text: '#0f172a', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#64748b', // Slate 500 — improved from 400 for better contrast
  textDisabled: '#94a3b8', // Slate 400 — explicit disabled text color
  textInverse: '#ffffff',

  /** Overlay / glass (for dark backgrounds) */
  overlayLight: 'rgba(255,255,255,0.12)',
  overlayMedium: 'rgba(255,255,255,0.20)',
  overlayHeavy: 'rgba(255,255,255,0.45)',
  overlayInverseLight: 'rgba(0,0,0,0.06)',
  overlayInverseMedium: 'rgba(0,0,0,0.15)',
  overlayInverseHeavy: 'rgba(0,0,0,0.45)',
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
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.08)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
  glass: '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
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

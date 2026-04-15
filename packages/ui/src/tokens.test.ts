import { describe, it, expect } from 'vitest';
import { tokens, colors, spacing, radius, fontSize, shadows, fontWeight } from './index.js';

describe('@connekt/ui design tokens', () => {
  it('exports primary brand color', () => {
    expect(colors.primary).toBe('#0f172a');
  });

  it('exports semantic colors', () => {
    expect(colors.success).toBe('#10b981');
    expect(colors.danger).toBe('#ef4444');
    expect(colors.warning).toBe('#f59e0b');
    expect(colors.info).toBe('#3b82f6');
  });

  it('spacing scale is consistent', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
  });

  it('border radius includes full for pills', () => {
    expect(radius.full).toBe(9999);
    expect(radius.md).toBe(10);
  });

  it('font sizes are defined', () => {
    expect(fontSize.sm).toBe(14);
    expect(fontSize.md).toBe(15);
    expect(fontSize.xl).toBe(22);
  });

  it('semantic colors include dark variants for high-contrast text', () => {
    expect(colors.successDark).toBe('#047857');
    expect(colors.warningDark).toBe('#92400e');
    expect(colors.dangerDark).toBe('#991b1b');
    expect(colors.infoDark).toBe('#1e40af');
  });

  it('overlay tokens are defined', () => {
    expect(colors.overlayLight).toBe('rgba(255,255,255,0.12)');
    expect(colors.overlayMedium).toBe('rgba(255,255,255,0.20)');
    expect(colors.overlayHeavy).toBe('rgba(255,255,255,0.45)');
    expect(colors.overlayInverseHeavy).toBe('rgba(0,0,0,0.45)');
  });

  it('textMuted has improved contrast (Slate 500)', () => {
    expect(colors.textMuted).toBe('#64748b');
  });

  it('tokens object aggregates all sub-tokens', () => {
    expect(tokens.colors).toBe(colors);
    expect(tokens.spacing).toBe(spacing);
  });

  it('shadows scale is defined', () => {
    expect(shadows.sm).toBeDefined();
    expect(shadows.md).toBeDefined();
    expect(shadows.lg).toBeDefined();
  });

  it('font weights are defined', () => {
    expect(fontWeight.normal).toBe(400);
    expect(fontWeight.medium).toBe(500);
    expect(fontWeight.semibold).toBe(600);
    expect(fontWeight.bold).toBe(700);
  });
});

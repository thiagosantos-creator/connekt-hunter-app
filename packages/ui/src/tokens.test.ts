import { describe, it, expect } from 'vitest';
import { tokens, colors, spacing, radius, fontSize, shadows, fontWeight } from './index.js';

describe('@connekt/ui design tokens', () => {
  it('exports primary brand color', () => {
    expect(colors.primary).toBe('#1a1a2e');
  });

  it('exports semantic colors', () => {
    expect(colors.success).toBe('#059669');
    expect(colors.danger).toBe('#dc2626');
    expect(colors.warning).toBe('#d97706');
    expect(colors.info).toBe('#2563eb');
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
    expect(radius.md).toBe(8);
  });

  it('font sizes are defined', () => {
    expect(fontSize.sm).toBe(13);
    expect(fontSize.md).toBe(14);
    expect(fontSize.xl).toBe(20);
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

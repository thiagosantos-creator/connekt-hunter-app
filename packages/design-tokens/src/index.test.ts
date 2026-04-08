import assert from 'node:assert/strict';
import test from 'node:test';

import { designTokens } from './index';

test('design tokens expose an accent color', () => {
  assert.equal(designTokens.colors.accent, '#38bdf8');
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { packageName } from './index.js';

test('design-tokens exposes its package name', () => {
  assert.equal(packageName, '@connekt-hunter/design-tokens');
});

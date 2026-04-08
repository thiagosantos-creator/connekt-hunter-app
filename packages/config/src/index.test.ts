import test from 'node:test';
import assert from 'node:assert/strict';

import { packageName } from './index.js';

test('config exposes its package name', () => {
  assert.equal(packageName, '@connekt-hunter/config');
});

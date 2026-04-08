import assert from 'node:assert/strict';
import test from 'node:test';

import { navigationItems } from './navigation';

test('backoffice navigation exposes the requested sections', () => {
  assert.equal(navigationItems.length, 9);
});

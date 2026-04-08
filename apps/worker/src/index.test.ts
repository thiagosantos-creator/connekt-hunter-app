import test from 'node:test';
import assert from 'node:assert/strict';

import { workspaceName } from './index.js';

test('worker exposes its workspace name', () => {
  assert.equal(workspaceName, '@connekt-hunter/worker');
});

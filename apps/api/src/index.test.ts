import test from 'node:test';
import assert from 'node:assert/strict';

import { workspaceName } from './index.js';

test('api exposes its workspace name', () => {
  assert.equal(workspaceName, '@connekt-hunter/api');
});

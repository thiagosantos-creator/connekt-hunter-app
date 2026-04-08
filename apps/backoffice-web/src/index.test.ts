import test from 'node:test';
import assert from 'node:assert/strict';

import { workspaceName } from './index.js';

test('backoffice-web exposes its workspace name', () => {
  assert.equal(workspaceName, '@connekt-hunter/backoffice-web');
});

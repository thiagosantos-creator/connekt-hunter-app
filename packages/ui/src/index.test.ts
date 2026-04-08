import assert from 'node:assert/strict';
import test from 'node:test';

import { SectionCard, WorkspaceShell } from './index';

test('ui exports the shared components', () => {
  assert.equal(typeof WorkspaceShell, 'function');
  assert.equal(typeof SectionCard, 'function');
});

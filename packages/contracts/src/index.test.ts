import assert from 'node:assert/strict';
import test from 'node:test';

import { backendModuleKeys, platformProfiles } from './index';

test('contracts expose the expected platform profiles', () => {
  assert.equal(platformProfiles.length, 4);
});

test('contracts expose all requested backend modules', () => {
  assert.equal(backendModuleKeys.length, 18);
});

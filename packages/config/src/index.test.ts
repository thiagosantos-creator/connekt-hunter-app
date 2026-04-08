import assert from 'node:assert/strict';
import test from 'node:test';

import { envExampleFiles, servicePorts } from './index';

test('config exposes the api port', () => {
  assert.equal(servicePorts.api, 3001);
});

test('config lists environment templates', () => {
  assert.equal(envExampleFiles.length, 3);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { HealthController } from './health.controller';

test('health controller returns an ok payload', () => {
  const controller = new HealthController();
  assert.equal(controller.getHealth().status, 'ok');
});

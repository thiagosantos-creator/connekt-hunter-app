import assert from 'node:assert/strict';
import test from 'node:test';

import { QueueRegistry } from './queue.registry';

test('worker registry exposes the expected queues', () => {
  const registry = new QueueRegistry();
  assert.equal(registry.listQueues().length, 5);
});

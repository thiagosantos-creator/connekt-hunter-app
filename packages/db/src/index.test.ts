import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { dbEntities, schemaPath } from './index';

test('db package tracks the expected entity list', () => {
  assert.equal(dbEntities.length, 29);
});

test('prisma schema contains the User model', () => {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  assert.match(schema, /model User \{/);
  assert.match(schema, /model OutboxEvent \{/);
});

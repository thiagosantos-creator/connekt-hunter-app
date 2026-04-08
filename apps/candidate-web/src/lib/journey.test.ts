import assert from 'node:assert/strict';
import test from 'node:test';

import { candidateJourney } from './journey';

test('candidate journey exposes the expected number of stages', () => {
  assert.equal(candidateJourney.length, 11);
});

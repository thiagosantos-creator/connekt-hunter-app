import assert from 'node:assert/strict';
import test from 'node:test';

import { backofficeNavigation, candidateJourneySteps } from './index';

test('api-client exposes backoffice navigation placeholders', () => {
  assert.equal(backofficeNavigation.length, 9);
});

test('api-client exposes candidate journey steps', () => {
  assert.equal(candidateJourneySteps[0], 'token-entry');
});

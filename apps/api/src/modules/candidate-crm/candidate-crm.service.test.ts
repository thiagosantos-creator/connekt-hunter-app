import assert from 'node:assert/strict';
import test from 'node:test';

import { CandidateCrmService } from './candidate-crm.service';

test('candidate-crm service exposes its spec path', () => {
  const service = new CandidateCrmService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/candidate-crm/spec.md',
  );
});

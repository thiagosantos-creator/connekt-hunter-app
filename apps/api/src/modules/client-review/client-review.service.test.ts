import assert from 'node:assert/strict';
import test from 'node:test';

import { ClientReviewService } from './client-review.service';

test('client-review service exposes its spec path', () => {
  const service = new ClientReviewService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/client-review/spec.md',
  );
});

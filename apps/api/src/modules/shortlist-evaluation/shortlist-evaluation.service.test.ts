import assert from 'node:assert/strict';
import test from 'node:test';

import { ShortlistEvaluationService } from './shortlist-evaluation.service';

test('shortlist-evaluation service exposes its spec path', () => {
  const service = new ShortlistEvaluationService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/shortlist-evaluation/spec.md',
  );
});

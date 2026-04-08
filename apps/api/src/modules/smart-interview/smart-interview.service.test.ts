import assert from 'node:assert/strict';
import test from 'node:test';

import { SmartInterviewService } from './smart-interview.service';

test('smart-interview service exposes its spec path', () => {
  const service = new SmartInterviewService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/smart-interview/spec.md',
  );
});

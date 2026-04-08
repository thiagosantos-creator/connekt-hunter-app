import assert from 'node:assert/strict';
import test from 'node:test';

import { ResumeProcessingService } from './resume-processing.service';

test('resume-processing service exposes its spec path', () => {
  const service = new ResumeProcessingService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/resume-processing/spec.md',
  );
});

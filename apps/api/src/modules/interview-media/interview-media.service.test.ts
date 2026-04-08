import assert from 'node:assert/strict';
import test from 'node:test';

import { InterviewMediaService } from './interview-media.service';

test('interview-media service exposes its spec path', () => {
  const service = new InterviewMediaService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/interview-media/spec.md',
  );
});

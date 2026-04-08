import assert from 'node:assert/strict';
import test from 'node:test';

import { AiOrchestrationService } from './ai-orchestration.service';

test('ai-orchestration service exposes its spec path', () => {
  const service = new AiOrchestrationService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/ai-orchestration/spec.md',
  );
});

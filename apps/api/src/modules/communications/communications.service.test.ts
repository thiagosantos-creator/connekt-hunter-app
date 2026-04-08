import assert from 'node:assert/strict';
import test from 'node:test';

import { CommunicationsService } from './communications.service';

test('communications service exposes its spec path', () => {
  const service = new CommunicationsService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/communications/spec.md',
  );
});

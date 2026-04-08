import assert from 'node:assert/strict';
import test from 'node:test';

import { IntegrationsHubService } from './integrations-hub.service';

test('integrations-hub service exposes its spec path', () => {
  const service = new IntegrationsHubService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/integrations-hub/spec.md',
  );
});

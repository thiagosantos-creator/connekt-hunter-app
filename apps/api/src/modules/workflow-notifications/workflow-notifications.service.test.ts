import assert from 'node:assert/strict';
import test from 'node:test';

import { WorkflowNotificationsService } from './workflow-notifications.service';

test('workflow-notifications service exposes its spec path', () => {
  const service = new WorkflowNotificationsService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/workflow-notifications/spec.md',
  );
});

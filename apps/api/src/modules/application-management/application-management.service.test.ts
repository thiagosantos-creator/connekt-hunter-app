import assert from 'node:assert/strict';
import test from 'node:test';

import { ApplicationManagementService } from './application-management.service';

test('application-management service exposes its spec path', () => {
  const service = new ApplicationManagementService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/application-management/spec.md',
  );
});

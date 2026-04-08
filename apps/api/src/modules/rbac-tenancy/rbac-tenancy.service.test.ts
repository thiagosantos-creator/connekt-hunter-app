import assert from 'node:assert/strict';
import test from 'node:test';

import { RbacTenancyService } from './rbac-tenancy.service';

test('rbac-tenancy service exposes its spec path', () => {
  const service = new RbacTenancyService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/rbac-tenancy/spec.md',
  );
});

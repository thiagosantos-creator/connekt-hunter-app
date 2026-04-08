import assert from 'node:assert/strict';
import test from 'node:test';

import { OrganizationsMembershipsService } from './organizations-memberships.service';

test('organizations-memberships service exposes its spec path', () => {
  const service = new OrganizationsMembershipsService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/organizations-memberships/spec.md',
  );
});

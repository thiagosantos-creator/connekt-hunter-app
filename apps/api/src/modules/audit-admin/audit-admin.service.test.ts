import assert from 'node:assert/strict';
import test from 'node:test';

import { AuditAdminService } from './audit-admin.service';

test('audit-admin service exposes its spec path', () => {
  const service = new AuditAdminService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/audit-admin/spec.md',
  );
});

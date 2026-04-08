import assert from 'node:assert/strict';
import test from 'node:test';

import { VacancyManagementService } from './vacancy-management.service';

test('vacancy-management service exposes its spec path', () => {
  const service = new VacancyManagementService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/vacancy-management/spec.md',
  );
});

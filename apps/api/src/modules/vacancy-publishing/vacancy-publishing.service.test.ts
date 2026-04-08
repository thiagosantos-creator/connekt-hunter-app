import assert from 'node:assert/strict';
import test from 'node:test';

import { VacancyPublishingService } from './vacancy-publishing.service';

test('vacancy-publishing service exposes its spec path', () => {
  const service = new VacancyPublishingService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/vacancy-publishing/spec.md',
  );
});

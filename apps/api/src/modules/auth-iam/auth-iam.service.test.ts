import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthIamService } from './auth-iam.service';

test('auth-iam service exposes its spec path', () => {
  const service = new AuthIamService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/auth-iam/spec.md',
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { CandidateOnboardingService } from './candidate-onboarding.service';

test('candidate-onboarding service exposes its spec path', () => {
  const service = new CandidateOnboardingService();
  assert.equal(
    service.getSummary().specPath,
    'docs/sdd/modules/candidate-onboarding/spec.md',
  );
});

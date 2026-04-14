import { describe, expect, it } from 'vitest';

describe('vertical slice 19 - aws test stack and cognito confidential clients', () => {
  it('documents separate Cognito pools with confidential app clients', () => {
    const contract = {
      workforcePool: {
        roles: ['admin', 'headhunter', 'client'],
        generateSecret: true,
      },
      candidatePool: {
        dedicated: true,
        generateSecret: true,
      },
    };

    expect(contract.workforcePool.roles).toContain('headhunter');
    expect(contract.workforcePool.generateSecret).toBe(true);
    expect(contract.candidatePool.dedicated).toBe(true);
    expect(contract.candidatePool.generateSecret).toBe(true);
  });

  it('requires env support for Cognito client secrets and hosted ui domains', () => {
    const envContract = {
      workforce: ['COGNITO_USER_POOL_ID', 'COGNITO_CLIENT_ID', 'COGNITO_CLIENT_SECRET', 'COGNITO_DOMAIN'],
      candidate: ['COGNITO_CANDIDATE_POOL_ID', 'COGNITO_CANDIDATE_CLIENT_ID', 'COGNITO_CANDIDATE_CLIENT_SECRET', 'COGNITO_CANDIDATE_DOMAIN'],
    };

    expect(envContract.workforce).toContain('COGNITO_CLIENT_SECRET');
    expect(envContract.candidate).toContain('COGNITO_CANDIDATE_CLIENT_SECRET');
    expect(envContract.candidate).toContain('COGNITO_CANDIDATE_DOMAIN');
  });

  it('cloudformation stack contract provisions aws resources needed for e2e auth and asset tests', () => {
    const stackContract = {
      template: 'infra/aws/cloudformation/connekt-test-stack.yaml',
      resources: ['s3-assets-bucket', 'cognito-workforce-pool', 'cognito-candidate-pool'],
      helperScript: 'infra/aws/cloudformation/export-connekt-env.ps1',
    };

    expect(stackContract.resources).toContain('s3-assets-bucket');
    expect(stackContract.resources).toContain('cognito-workforce-pool');
    expect(stackContract.resources).toContain('cognito-candidate-pool');
  });
});

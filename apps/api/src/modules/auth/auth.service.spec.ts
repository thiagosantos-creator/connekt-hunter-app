import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function createService() {
    return new AuthService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  }

  it('reports Cognito candidate client secret configuration without exposing the secret value', () => {
    vi.stubEnv('COGNITO_CANDIDATE_POOL_ID', 'candidate-pool');
    vi.stubEnv('COGNITO_CANDIDATE_CLIENT_ID', 'candidate-client');
    vi.stubEnv('COGNITO_CANDIDATE_CLIENT_SECRET', 'super-secret-value');
    vi.stubEnv('COGNITO_CANDIDATE_DOMAIN', 'candidate-domain.auth.us-east-1.amazoncognito.com');

    const service = createService();
    const config = service.getCandidateAuthConfig();

    expect(config.clientSecretConfigured).toBe(true);
    expect(config.usesClientSecret).toBe(true);
    expect(config.hostedUiUrl).toContain('candidate-domain.auth.us-east-1.amazoncognito.com');
    expect(Object.values(config as Record<string, unknown>)).not.toContain('super-secret-value');
  });

  it('falls back to workforce Cognito domain and secret when candidate-specific values are absent', () => {
    vi.stubEnv('COGNITO_USER_POOL_ID', 'workforce-pool');
    vi.stubEnv('COGNITO_CLIENT_ID', 'workforce-client');
    vi.stubEnv('COGNITO_CLIENT_SECRET', 'workforce-secret');
    vi.stubEnv('COGNITO_DOMAIN', 'company-domain.auth.us-east-1.amazoncognito.com');

    const service = createService();
    const config = service.getCandidateAuthConfig();

    expect(config.poolId).toBe('workforce-pool');
    expect(config.clientId).toBe('workforce-client');
    expect(config.clientSecretConfigured).toBe(true);
    expect(config.hostedUiUrl).toContain('company-domain.auth.us-east-1.amazoncognito.com');
    expect(config.tokenEndpoint).toBe('https://company-domain.auth.us-east-1.amazoncognito.com/oauth2/token');
  });
});

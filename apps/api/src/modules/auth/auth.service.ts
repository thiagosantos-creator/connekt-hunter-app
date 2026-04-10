import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import type { AuthSession, LoginResult, MembershipReference } from './auth.types.js';
import { DevAuthProvider } from './providers/dev-auth.provider.js';
import { CognitoAuthProvider } from './providers/cognito-auth.provider.js';
import { IntegrationsConfigService } from '../integrations/integrations-config.service.js';
import { PublicTokenCacheService } from './public-token-cache.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly devProvider: DevAuthProvider,
    private readonly cognitoProvider: CognitoAuthProvider,
    private readonly integrationsConfig: IntegrationsConfigService,
    private readonly tokenCache: PublicTokenCacheService,
  ) {}

  async login(email: string, password?: string): Promise<LoginResult> {
    const preferRealProvider = this.integrationsConfig.isIntegrationEnabled('auth');

    if (preferRealProvider) {
      const fromCognito = await this.cognitoProvider.login({ email, password });
      if (fromCognito) return fromCognito;
    }

    const fromDev = await this.devProvider.login({ email, password });
    if (!fromDev) {
      throw new UnauthorizedException('user_not_found');
    }
    return fromDev;
  }

  async devLogin(email: string) {
    return this.login(email);
  }

  async validateBearerToken(token: string): Promise<AuthSession | null> {
    if (token.startsWith('dev-')) {
      const userId = token.slice('dev-'.length);
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { memberships: true } });
      if (!user) return null;
      return {
        token,
        provider: 'legacy-dev-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'admin' | 'headhunter' | 'client' | 'candidate',
          organizationIds: user.memberships.map((membership: MembershipReference) => membership.organizationId),
        },
      };
    }

    const fromDev = await this.devProvider.validateToken(token);
    if (fromDev) return fromDev;

    const fromCognito = await this.cognitoProvider.validateToken(token);
    if (fromCognito) return fromCognito;

    return null;
  }

  async revokeSession(token: string): Promise<void> {
    await prisma.userSession.updateMany({ where: { token, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async guestUpgrade(token: string, email: string, fullName: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token }, include: { profile: true } });

    const user = await prisma.user.upsert({
      where: { email },
      update: { name: fullName || candidate.profile?.fullName || 'Candidate', role: 'candidate' },
      create: { email, name: fullName || candidate.profile?.fullName || 'Candidate', role: 'candidate' },
    });

    await prisma.authIdentity.upsert({
      where: { provider_subject: { provider: 'candidate-passwordless', subject: email } },
      update: { userId: user.id },
      create: { provider: 'candidate-passwordless', subject: email, userId: user.id, email },
    });

    await prisma.guestSession.updateMany({ where: { token }, data: { upgradedAt: new Date() } });
    await this.tokenCache.invalidate(token);

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { userId: user.id, guestUpgradeAt: new Date() },
    });

    return this.login(email);
  }

  /**
   * Returns configuration for Cognito-based candidate authentication.
   * Candidates authenticate via Cognito Hosted UI with Social Login (Google / LinkedIn).
   * Password management, MFA, and social identity federation are handled entirely by Cognito.
   */
  getCandidateAuthConfig() {
    const poolId = process.env.COGNITO_CANDIDATE_POOL_ID ?? process.env.COGNITO_USER_POOL_ID ?? '';
    const clientId = process.env.COGNITO_CANDIDATE_CLIENT_ID ?? process.env.COGNITO_CLIENT_ID ?? '';
    const domain = process.env.COGNITO_CANDIDATE_DOMAIN ?? '';
    const redirectUri = process.env.COGNITO_CANDIDATE_REDIRECT_URI ?? 'http://localhost:5174/auth/callback';
    const region = process.env.AWS_REGION ?? process.env.S3_REGION ?? 'us-east-1';

    if (!poolId || !clientId) {
      this.logger.warn('Cognito candidate pool not configured. Social login unavailable.');
    }

    return {
      provider: 'aws-cognito',
      poolId,
      clientId,
      domain,
      region,
      redirectUri,
      socialProviders: ['Google', 'LinkedIn'] as const,
      hostedUiUrl: domain
        ? `https://${domain}/oauth2/authorize?client_id=${clientId}&response_type=code&scope=openid+email+profile&redirect_uri=${encodeURIComponent(redirectUri)}`
        : null,
      changePasswordUrl: domain
        ? `https://${domain}/forgotPassword?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
        : null,
    };
  }
}

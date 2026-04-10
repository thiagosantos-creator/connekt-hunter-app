import { Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import type { AuthSession, LoginResult, MembershipReference } from './auth.types.js';
import { DevAuthProvider } from './providers/dev-auth.provider.js';
import { CognitoAuthProvider } from './providers/cognito-auth.provider.js';
import { IntegrationsConfigService } from '../integrations/integrations-config.service.js';
import { PublicTokenCacheService } from './public-token-cache.service.js';

@Injectable()
export class AuthService {
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
}

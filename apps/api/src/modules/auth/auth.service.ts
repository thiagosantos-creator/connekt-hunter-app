import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
    @Inject(DevAuthProvider) private readonly devProvider: DevAuthProvider,
    @Inject(CognitoAuthProvider) private readonly cognitoProvider: CognitoAuthProvider,
    @Inject(IntegrationsConfigService) private readonly integrationsConfig: IntegrationsConfigService,
    @Inject(PublicTokenCacheService) private readonly tokenCache: PublicTokenCacheService,
  ) {}

  async login(email: string, password?: string): Promise<LoginResult> {
    const preferRealProvider = this.integrationsConfig.isIntegrationEnabled('auth');

    if (preferRealProvider) {
      const fromCognito = await this.cognitoProvider.login({ email, password });
      if (fromCognito) {
        await prisma.auditEvent.create({
          data: {
            actorId: fromCognito.user.id,
            action: 'auth.login',
            entityType: 'user-session',
            entityId: fromCognito.token,
            metadata: { provider: fromCognito.provider } as never,
          },
        });
        return fromCognito;
      }
    }

    const fromDev = await this.devProvider.login({ email, password });
    if (!fromDev) {
      throw new UnauthorizedException('user_not_found');
    }
    await prisma.auditEvent.create({
      data: {
        actorId: fromDev.user.id,
        action: 'auth.login',
        entityType: 'user-session',
        entityId: fromDev.token,
        metadata: { provider: fromDev.provider } as never,
      },
    });
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
          title: user.title ?? undefined,
          avatarUrl: user.avatarUrl ?? undefined,
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

  async guestUpgrade(token: string, email: string, fullName: string, password?: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token }, include: { profile: true } });

    const user = await prisma.user.upsert({
      where: { email },
      update: { name: fullName || candidate.profile?.fullName || 'Candidate', role: 'candidate' },
      create: { email, name: fullName || candidate.profile?.fullName || 'Candidate', role: 'candidate' },
    });

    if (password) {
      // Create a local password-based identity for the candidate
      const passwordHash = await AuthService.hashPassword(password);
      await prisma.authIdentity.upsert({
        where: { provider_subject: { provider: 'candidate-local', subject: email } },
        update: { userId: user.id, passwordHash },
        create: { provider: 'candidate-local', subject: email, userId: user.id, email, passwordHash },
      });
    } else {
      await prisma.authIdentity.upsert({
        where: { provider_subject: { provider: 'candidate-passwordless', subject: email } },
        update: { userId: user.id },
        create: { provider: 'candidate-passwordless', subject: email, userId: user.id, email },
      });
    }

    await prisma.guestSession.updateMany({ where: { token }, data: { upgradedAt: new Date() } });
    await this.tokenCache.invalidate(token);

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { userId: user.id, guestUpgradeAt: new Date() },
    });

    return this.login(email, password);
  }

  /**
   * Authenticate a candidate via email + password (local identity).
   * Validates against `candidate-local` AuthIdentity using scrypt hash.
   */
  async candidateLogin(email: string, password: string): Promise<LoginResult & { candidateToken?: string }> {
    const identity = await prisma.authIdentity.findUnique({
      where: { provider_subject: { provider: 'candidate-local', subject: email } },
      include: { user: true },
    });

    if (!identity?.passwordHash) {
      throw new UnauthorizedException('invalid_credentials');
    }

    const valid = await AuthService.verifyPassword(password, identity.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('invalid_credentials');
    }

    // Find the candidate record linked to this user
    const candidate = await prisma.candidate.findFirst({
      where: { userId: identity.userId },
    });

    const loginResult = await this.login(email, password);

    await prisma.auditEvent.create({
      data: {
        actorId: loginResult.user.id,
        action: 'auth.candidate_login',
        entityType: 'user-session',
        entityId: loginResult.token,
        metadata: { provider: 'candidate-local', candidateId: candidate?.id } as never,
      },
    });

    return { ...loginResult, candidateToken: candidate?.token ?? undefined };
  }

  private static readonly SCRYPT_KEY_LENGTH = 64;

  /** Hash a password using scrypt */
  private static async hashPassword(password: string): Promise<string> {
    const { scrypt, randomBytes } = await import('node:crypto');
    const { promisify } = await import('node:util');
    const scryptAsync = promisify(scrypt);
    const salt = randomBytes(16).toString('hex');
    const hash = (await scryptAsync(password, salt, AuthService.SCRYPT_KEY_LENGTH)) as Buffer;
    return `${salt}:${hash.toString('hex')}`;
  }

  /** Verify a password against a stored scrypt hash */
  private static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const { scrypt, timingSafeEqual } = await import('node:crypto');
    const { promisify } = await import('node:util');
    const scryptAsync = promisify(scrypt);
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const derived = (await scryptAsync(password, salt, AuthService.SCRYPT_KEY_LENGTH)) as Buffer;
    return timingSafeEqual(Buffer.from(hash, 'hex'), derived);
  }

  /**
   * Returns configuration for Cognito-based candidate authentication.
   * Candidates authenticate via Cognito Hosted UI with Social Login (Google / LinkedIn).
   * Password management, MFA, and social identity federation are handled entirely by Cognito.
   */
  getCandidateAuthConfig() {
    const poolId = process.env.COGNITO_CANDIDATE_POOL_ID ?? process.env.COGNITO_USER_POOL_ID ?? '';
    const clientId = process.env.COGNITO_CANDIDATE_CLIENT_ID ?? process.env.COGNITO_CLIENT_ID ?? '';
    const clientSecret = process.env.COGNITO_CANDIDATE_CLIENT_SECRET ?? process.env.COGNITO_CLIENT_SECRET ?? '';
    const domain = process.env.COGNITO_CANDIDATE_DOMAIN ?? process.env.COGNITO_DOMAIN ?? '';
    const redirectUri = process.env.COGNITO_CANDIDATE_REDIRECT_URI ?? 'http://localhost:5174/auth/callback';
    const logoutUri = process.env.COGNITO_CANDIDATE_LOGOUT_URI ?? 'http://localhost:5174';
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
      logoutUri,
      socialProviders: ['Google', 'LinkedIn'] as const,
      hostedUiUrl: domain
        ? `https://${domain}/oauth2/authorize?client_id=${clientId}&response_type=code&scope=openid+email+profile&redirect_uri=${encodeURIComponent(redirectUri)}`
        : null,
      tokenEndpoint: domain ? `https://${domain}/oauth2/token` : null,
      changePasswordUrl: domain
        ? `https://${domain}/forgotPassword?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
        : null,
      logoutUrl: domain
        ? `https://${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`
        : null,
    };
  }
}

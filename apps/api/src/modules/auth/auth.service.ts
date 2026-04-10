import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { AuthSession, LoginResult, MembershipReference } from './auth.types.js';
import { DevAuthProvider } from './providers/dev-auth.provider.js';
import { CognitoAuthProvider } from './providers/cognito-auth.provider.js';
import { IntegrationsConfigService } from '../integrations/integrations-config.service.js';
import { PublicTokenCacheService } from './public-token-cache.service.js';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const separatorIndex = stored.indexOf(':');
  if (separatorIndex === -1) return false;
  const salt = stored.slice(0, separatorIndex);
  const hash = stored.slice(separatorIndex + 1);
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

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

  async guestUpgrade(token: string, email: string, fullName: string, password?: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token }, include: { profile: true } });

    const user = await prisma.user.upsert({
      where: { email },
      update: { name: fullName || candidate.profile?.fullName || 'Candidate', role: 'candidate' },
      create: { email, name: fullName || candidate.profile?.fullName || 'Candidate', role: 'candidate' },
    });

    const provider = password ? 'candidate-local' : 'candidate-passwordless';
    const hashed = password ? await hashPassword(password) : null;

    await prisma.authIdentity.upsert({
      where: { provider_subject: { provider, subject: email } },
      update: { userId: user.id, passwordHash: hashed },
      create: { provider, subject: email, userId: user.id, email, passwordHash: hashed },
    });

    await prisma.guestSession.updateMany({ where: { token }, data: { upgradedAt: new Date() } });
    await this.tokenCache.invalidate(token);

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { userId: user.id, guestUpgradeAt: new Date() },
    });

    await prisma.auditEvent.create({
      data: { actorId: user.id, action: 'guest.upgrade', entityType: 'User', entityId: user.id, metadata: { email, hasPassword: !!password } as never },
    });

    return this.login(email);
  }

  async changePassword(userId: string, currentPassword: string | undefined, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('password_too_short');
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const identity = await prisma.authIdentity.findFirst({
      where: { userId, provider: { in: ['candidate-local', 'candidate-passwordless'] } },
    });

    if (identity?.passwordHash) {
      if (!currentPassword) {
        throw new BadRequestException('current_password_required');
      }
      const valid = await verifyPassword(currentPassword, identity.passwordHash);
      if (!valid) throw new UnauthorizedException('invalid_current_password');
    }

    const hashed = await hashPassword(newPassword);

    if (identity) {
      await prisma.authIdentity.update({
        where: { id: identity.id },
        data: { passwordHash: hashed, provider: 'candidate-local' },
      });
    } else {
      await prisma.authIdentity.create({
        data: { provider: 'candidate-local', subject: user.email, userId, email: user.email, passwordHash: hashed },
      });
    }

    await prisma.auditEvent.create({
      data: { actorId: userId, action: 'password.changed', entityType: 'User', entityId: userId, metadata: {} as never },
    });

    return { ok: true };
  }
}

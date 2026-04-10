import { Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import type { AuthSession, LoginResult } from './auth.types.js';
import { DevAuthProvider } from './providers/dev-auth.provider.js';
import { PlaceholderIamProvider } from './providers/placeholder-iam.provider.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly devProvider: DevAuthProvider,
    private readonly iamProvider: PlaceholderIamProvider,
  ) {}

  async login(email: string, password?: string): Promise<LoginResult> {
    const preferRealProvider = process.env.AUTH_REAL_PROVIDER === 'true';

    if (preferRealProvider) {
      const fromIam = await this.iamProvider.login({ email, password });
      if (fromIam) return fromIam;
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
          organizationIds: user.memberships.map((membership) => membership.organizationId),
        },
      };
    }

    const fromDev = await this.devProvider.validateToken(token);
    if (fromDev) return fromDev;

    return this.iamProvider.validateToken(token);
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

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { userId: user.id, guestUpgradeAt: new Date() },
    });

    return this.login(email);
  }
}

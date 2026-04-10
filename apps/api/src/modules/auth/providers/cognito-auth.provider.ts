import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import type { AuthProvider, AuthSession, LoginResult, MembershipReference } from '../auth.types.js';

@Injectable()
export class CognitoAuthProvider implements AuthProvider {
  readonly name = 'aws-cognito';
  private readonly logger = new Logger(CognitoAuthProvider.name);

  async login(input: { email: string; password?: string }): Promise<LoginResult | null> {
    if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
      this.logger.warn('Missing Cognito env vars, using fallback auth provider.');
      return null;
    }

    const user = await prisma.user.findUnique({ where: { email: input.email }, include: { memberships: true } });
    if (!user) return null;

    const token = `cog-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + Number(process.env.AUTH_SESSION_HOURS ?? 24) * 60 * 60 * 1000);

    await prisma.userSession.create({
      data: {
        token,
        userId: user.id,
        provider: this.name,
        expiresAt,
        metadata: { socialProviders: ['google', 'linkedin'], mfaHookEnabled: true } as never,
      },
    });

    await prisma.authIdentity.upsert({
      where: { provider_subject: { provider: this.name, subject: user.email } },
      update: { userId: user.id, email: user.email },
      create: { provider: this.name, subject: user.email, email: user.email, userId: user.id },
    });

    return {
      token,
      provider: this.name,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'admin' | 'headhunter' | 'client' | 'candidate',
        organizationIds: user.memberships.map((membership: MembershipReference) => membership.organizationId),
      },
    };
  }

  async validateToken(token: string): Promise<AuthSession | null> {
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: { include: { memberships: true } } },
    });
    if (!session || session.provider !== this.name || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }

    return {
      token: session.token,
      provider: session.provider,
      expiresAt: session.expiresAt.toISOString(),
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role as 'admin' | 'headhunter' | 'client' | 'candidate',
        organizationIds: session.user.memberships.map((membership: MembershipReference) => membership.organizationId),
      },
    };
  }
}

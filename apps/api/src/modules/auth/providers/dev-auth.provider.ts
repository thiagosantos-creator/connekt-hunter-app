import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import type { AuthProvider, AuthSession, LoginResult } from '../auth.types.js';

const SESSION_HOURS = Number(process.env.AUTH_SESSION_HOURS ?? 24);

@Injectable()
export class DevAuthProvider implements AuthProvider {
  readonly name = 'dev-local';

  async login(input: { email: string }): Promise<LoginResult | null> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { memberships: true },
    });

    if (!user) return null;

    const token = `sess-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

    await prisma.userSession.create({
      data: {
        token,
        provider: this.name,
        userId: user.id,
        expiresAt,
        metadata: { mode: 'dev' },
      },
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
        organizationIds: user.memberships.map((membership) => membership.organizationId),
      },
    };
  }

  async validateToken(token: string): Promise<AuthSession | null> {
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: {
        user: {
          include: { memberships: true },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
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
        organizationIds: session.user.memberships.map((membership) => membership.organizationId),
      },
    };
  }
}

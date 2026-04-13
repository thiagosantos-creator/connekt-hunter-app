import { CanActivate, ExecutionContext, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { PublicTokenCacheService } from './public-token-cache.service.js';

@Injectable()
export class PublicTokenGuard implements CanActivate {
  private readonly logger = new Logger(PublicTokenGuard.name);

  constructor(@Inject(PublicTokenCacheService) private readonly tokenCache: PublicTokenCacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ params?: Record<string, string>; body?: Record<string, string> }>();

    const token = req.params?.['token'] ?? req.params?.['publicToken'] ?? req.body?.['token'] ?? req.body?.['publicToken'];
    if (!token || typeof token !== 'string') {
      this.logger.warn(JSON.stringify({ event: 'public_token_missing_or_invalid', token: token ?? null }));
      throw new UnauthorizedException('token_required');
    }

    if (token.length < 10 || token.length > 200) {
      this.logger.warn(JSON.stringify({ event: 'public_token_invalid_format', tokenLength: token.length }));
      throw new UnauthorizedException('token_invalid_format');
    }

    const cached = await this.tokenCache.get(token);
    if (cached) {
      if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
        await this.tokenCache.invalidate(token);
        throw new UnauthorizedException('token_expired');
      }
      return true;
    }

    const [guestSession, smartInterviewSession, candidate] = await Promise.all([
      prisma.guestSession.findUnique({ where: { token } }),
      prisma.smartInterviewSession.findUnique({ where: { publicToken: token } }),
      prisma.candidate.findUnique({ where: { token } }),
    ]);

    if (guestSession) {
      if (guestSession.expiresAt && new Date(guestSession.expiresAt) < new Date()) {
        this.logger.warn(JSON.stringify({ event: 'public_token_expired', tokenType: 'guest-session', tokenPrefix: token.slice(0, 8) }));
        await this.tokenCache.invalidate(token);
        throw new UnauthorizedException('token_expired');
      }
      await this.tokenCache.set(token, {
        tokenType: 'guest-session',
        subjectId: guestSession.candidateId,
        expiresAt: guestSession.expiresAt.toISOString(),
      });
      return true;
    }

    if (smartInterviewSession) {
      await this.tokenCache.set(token, {
        tokenType: 'smart-interview-session',
        subjectId: smartInterviewSession.id,
      });
      return true;
    }

    if (candidate) {
      await this.tokenCache.set(token, {
        tokenType: 'candidate',
        subjectId: candidate.id,
      });
      return true;
    }

    this.logger.warn(JSON.stringify({ event: 'public_token_not_found', tokenPrefix: token.slice(0, 8) }));
    throw new UnauthorizedException('token_not_found');
  }
}

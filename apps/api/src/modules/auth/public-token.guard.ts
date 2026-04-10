import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@connekt/db';

/**
 * Guard for public candidate endpoints that use guest tokens.
 * Validates token format, existence, and expiration via GuestSession.
 */
@Injectable()
export class PublicTokenGuard implements CanActivate {
  private readonly logger = new Logger(PublicTokenGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ params?: Record<string, string>; body?: Record<string, string> }>();

    const token = req.params?.['token'] ?? req.body?.['token'];
    if (!token || typeof token !== 'string') {
      this.logger.warn(JSON.stringify({ event: 'public_token_missing_or_invalid', token: token ?? null }));
      throw new UnauthorizedException('token_required');
    }

    if (token.length < 10 || token.length > 200) {
      this.logger.warn(JSON.stringify({ event: 'public_token_invalid_format', tokenLength: token.length }));
      throw new UnauthorizedException('token_invalid_format');
    }

    const guestSession = await prisma.guestSession.findUnique({ where: { token } });
    if (!guestSession) {
      this.logger.warn(JSON.stringify({ event: 'public_token_not_found', tokenPrefix: token.slice(0, 8) }));
      throw new UnauthorizedException('token_not_found');
    }

    if (guestSession.expiresAt && new Date(guestSession.expiresAt) < new Date()) {
      this.logger.warn(
        JSON.stringify({ event: 'public_token_expired', tokenPrefix: token.slice(0, 8), expiresAt: guestSession.expiresAt }),
      );
      throw new UnauthorizedException('token_expired');
    }

    return true;
  }
}

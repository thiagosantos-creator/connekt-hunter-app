import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthUser } from './auth.types.js';
import { AuthService } from './auth.service.js';

/** Accepts both legacy `Bearer dev-{userId}` and session `Bearer sess-{uuid}` tokens. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: AuthUser }>();
    const authHeader = req.headers.authorization ?? req.headers.Authorization ?? '';
    if (!authHeader.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = authHeader.slice('Bearer '.length);
    const session = await this.authService.validateBearerToken(token);
    if (!session) throw new UnauthorizedException();

    req.user = session.user;
    return true;
  }
}

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@connekt/db';

/** Mock guard: accepts Bearer dev-{userId} tokens. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: unknown }>();
    const auth = req.headers['authorization'] ?? '';
    if (!auth.startsWith('Bearer dev-')) throw new UnauthorizedException();
    const userId = auth.slice('Bearer dev-'.length);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    req.user = user;
    return true;
  }
}

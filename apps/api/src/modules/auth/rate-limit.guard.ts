import { CanActivate, ExecutionContext, Injectable, Logger, HttpException } from '@nestjs/common';

/**
 * Simple in-memory rate limiting guard for public endpoints.
 * Limits requests per IP within a sliding window.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly windowMs = 60_000; // 1 minute
  private readonly maxRequests = 30;
  private readonly store = new Map<string, { count: number; resetAt: number }>();
  private lastCleanup = Date.now();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ ip?: string; headers: Record<string, string> }>();
    const ip = req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown';
    const now = Date.now();

    // Periodic cleanup of expired entries to prevent memory leaks
    if (now - this.lastCleanup > this.windowMs) {
      this.lastCleanup = now;
      for (const [key, val] of this.store) {
        if (now > val.resetAt) this.store.delete(key);
      }
    }

    const entry = this.store.get(ip);
    if (!entry || now > entry.resetAt) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    entry.count++;
    if (entry.count > this.maxRequests) {
      this.logger.warn(
        JSON.stringify({ event: 'rate_limit_exceeded', ip, count: entry.count }),
      );
      throw new HttpException('Too Many Requests', 429);
    }

    return true;
  }
}

import { CanActivate, ExecutionContext, Injectable, Logger, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { redisIncrWithExpire } from '../infra/redis.client.js';
import { RATE_LIMIT_CONFIG_KEY, type RateLimitConfig } from './rate-limit.decorator.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly defaultConfig: RateLimitConfig = {
    windowSec: Number(process.env.RATE_LIMIT_WINDOW_SEC ?? 60),
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 30),
    scope: 'public-default',
  };
  private readonly fallbackStore = new Map<string, { count: number; resetAt: number }>();
  private readonly fallbackCleanupIntervalMs = 30_000;
  private readonly fallbackMaxEntries = 5_000;
  private lastFallbackCleanupAt = 0;

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ ip?: string; headers: Record<string, string | string[]>; route?: { path?: string } }>();
    const ipSource = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(ipSource) ? ipSource[0] : ipSource;
    const ip = req.ip ?? forwardedIp ?? 'unknown';

    const perRoute = this.reflector.getAllAndOverride<RateLimitConfig>(RATE_LIMIT_CONFIG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const config = perRoute ?? this.defaultConfig;
    const routePath = req.route?.path ?? 'unknown';

    const allowed = await this.checkRedis(ip, config, routePath);
    if (!allowed) {
      this.logger.warn(JSON.stringify({ event: 'rate_limit_exceeded', ip, routePath, scope: config.scope, maxRequests: config.maxRequests }));
      throw new HttpException('too_many_requests', 429);
    }

    return true;
  }

  private async checkRedis(ip: string, config: RateLimitConfig, routePath: string): Promise<boolean> {
    const key = `ratelimit:v1:${config.scope}:${routePath}:${ip}`;
    try {
      const count = await redisIncrWithExpire(key, config.windowSec);
      if (count === null) return this.checkMemory(ip, config, routePath);
      return count <= config.maxRequests;
    } catch (error) {
      this.logger.warn(JSON.stringify({ event: 'rate_limit_redis_error', routePath, error: String(error), fallback: 'memory' }));
      return this.checkMemory(ip, config, routePath);
    }
  }

  private checkMemory(ip: string, config: RateLimitConfig, routePath: string): boolean {
    const now = Date.now();
    this.cleanupExpiredFallbackEntries(now);

    const key = `${config.scope}:${routePath}:${ip}`;
    const existing = this.fallbackStore.get(key);

    if (!existing || now > existing.resetAt) {
      this.fallbackStore.set(key, { count: 1, resetAt: now + config.windowSec * 1000 });
      return true;
    }

    existing.count++;
    return existing.count <= config.maxRequests;
  }

  private cleanupExpiredFallbackEntries(now: number): void {
    const shouldCleanupByTime = now - this.lastFallbackCleanupAt >= this.fallbackCleanupIntervalMs;
    const shouldCleanupBySize = this.fallbackStore.size >= this.fallbackMaxEntries;
    if (!shouldCleanupByTime && !shouldCleanupBySize) return;

    for (const [key, value] of this.fallbackStore.entries()) {
      if (now > value.resetAt) this.fallbackStore.delete(key);
    }
    this.lastFallbackCleanupAt = now;
  }
}

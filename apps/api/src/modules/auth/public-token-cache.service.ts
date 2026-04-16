import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { redisDel, redisGet, redisSetEx } from '../infra/redis.client.js';

export type CachedPublicToken = {
  tokenType: 'guest-session' | 'smart-interview-session' | 'candidate';
  subjectId: string;
  expiresAt?: string;
};

@Injectable()
export class PublicTokenCacheService {
  private readonly logger = new Logger(PublicTokenCacheService.name);
  private readonly localFallback = new Map<string, { value: CachedPublicToken; expiresAtMs: number }>();
  private readonly ttlSeconds = Number(process.env.PUBLIC_TOKEN_CACHE_TTL_SEC ?? 30);

  constructor() {
    // Periodic cleanup of expired local cache entries to prevent memory leaks
    const cleanupInterval = setInterval(() => this.cleanupExpired(), 60_000);
    cleanupInterval.unref(); // don't keep process alive
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.localFallback) {
      if (now > entry.expiresAtMs) {
        this.localFallback.delete(key);
      }
    }
  }

  private key(token: string): string {
    const digest = createHash('sha256').update(token).digest('hex');
    return `public-token:v1:${digest}`;
  }

  async get(token: string): Promise<CachedPublicToken | null> {
    const key = this.key(token);
    try {
      const raw = await redisGet(key);
      if (raw) {
        this.logger.log(JSON.stringify({ event: 'public_token_cache_hit', storage: 'redis' }));
        return JSON.parse(raw) as CachedPublicToken;
      }
      this.logger.log(JSON.stringify({ event: 'public_token_cache_miss', storage: 'redis' }));
    } catch (error) {
      this.logger.warn(JSON.stringify({ event: 'public_token_cache_redis_get_failed', error: String(error) }));
    }

    const local = this.localFallback.get(key);
    if (!local) {
      this.logger.log(JSON.stringify({ event: 'public_token_cache_miss', storage: 'memory' }));
      return null;
    }

    if (Date.now() > local.expiresAtMs) {
      this.localFallback.delete(key);
      this.logger.log(JSON.stringify({ event: 'public_token_cache_expired', storage: 'memory' }));
      return null;
    }

    this.logger.log(JSON.stringify({ event: 'public_token_cache_hit', storage: 'memory' }));
    return local.value;
  }

  async set(token: string, value: CachedPublicToken): Promise<void> {
    const key = this.key(token);
    const ok = await redisSetEx(key, this.ttlSeconds, JSON.stringify(value));
    if (ok) return;
    this.localFallback.set(key, { value, expiresAtMs: Date.now() + this.ttlSeconds * 1000 });
  }

  async invalidate(token: string): Promise<void> {
    const key = this.key(token);
    this.localFallback.delete(key);
    await redisDel(key);
  }
}

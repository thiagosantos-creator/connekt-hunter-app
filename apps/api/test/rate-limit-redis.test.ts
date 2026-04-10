import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from '../src/modules/auth/rate-limit.guard.js';

describe('RateLimitGuard fallback store cleanup', () => {
  const config = { scope: 'scope', windowSec: 10, maxRequests: 5 };

  it('evicts expired entries during fallback checks', () => {
    const guard = new RateLimitGuard(new Reflector()) as RateLimitGuard & {
      fallbackStore: Map<string, { count: number; resetAt: number }>;
      checkMemory: (ip: string, config: { scope: string; windowSec: number; maxRequests: number }, routePath: string) => boolean;
      lastFallbackCleanupAt: number;
    };

    guard.fallbackStore.set('scope:/route:old', { count: 1, resetAt: 1_000 });
    guard.fallbackStore.set('scope:/route:active', { count: 1, resetAt: 40_000 });
    guard.lastFallbackCleanupAt = 0;

    vi.spyOn(Date, 'now').mockReturnValue(31_000);
    const allowed = guard.checkMemory('new', config, '/route');

    expect(allowed).toBe(true);
    expect(guard.fallbackStore.has('scope:/route:old')).toBe(false);
    expect(guard.fallbackStore.has('scope:/route:active')).toBe(true);
  });

  it('throttles size-triggered cleanup scans while fallback store stays full', () => {
    const guard = new RateLimitGuard(new Reflector()) as RateLimitGuard & {
      fallbackStore: Map<string, { count: number; resetAt: number }>;
      checkMemory: (ip: string, config: { scope: string; windowSec: number; maxRequests: number }, routePath: string) => boolean;
      cleanupExpiredFallbackEntries: (now: number) => void;
      fallbackMaxEntries: number;
      lastFallbackCleanupAt: number;
      lastFallbackSizeCleanupAt: number;
    };

    guard.lastFallbackCleanupAt = 0;
    guard.lastFallbackSizeCleanupAt = 0;

    for (let i = 0; i < guard.fallbackMaxEntries; i++) {
      guard.fallbackStore.set(`scope:/route:key-${i}`, { count: 1, resetAt: 60_000 });
    }

    const entriesSpy = vi.spyOn(guard.fallbackStore, 'entries');

    guard.cleanupExpiredFallbackEntries(31_000);
    guard.cleanupExpiredFallbackEntries(31_100);

    expect(entriesSpy).toHaveBeenCalledTimes(1);
  });
});

describe('redisIncrWithExpire', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('uses a single EVAL command to increment and enforce TTL atomically', async () => {
    process.env.REDIS_ENABLED = 'true';
    process.env.REDIS_URL = 'redis://localhost:6379/0';

    const execFileMock = vi.fn((_cmd: string, _args: string[], _opts: unknown, callback: (error: Error | null, stdout: string) => void) => {
      callback(null, '3\n');
    });

    vi.doMock('node:child_process', () => ({ execFile: execFileMock }));

    const { redisIncrWithExpire } = await import('../src/modules/infra/redis.client.js');
    const count = await redisIncrWithExpire('ratelimit:key', 60);

    expect(count).toBe(3);
    expect(execFileMock).toHaveBeenCalledTimes(1);
    const [, args] = execFileMock.mock.calls[0] ?? [];
    expect(args).toEqual(
      expect.arrayContaining(['-u', 'redis://localhost:6379/0', '--raw', 'EVAL', expect.stringContaining('INCR'), '1', 'ratelimit:key', '60']),
    );
  });
});

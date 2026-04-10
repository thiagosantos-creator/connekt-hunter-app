import { Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';

const logger = new Logger('RedisClient');

const REDIS_URL = process.env.REDIS_URL;
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

function runRedisCli(args: string[]): Promise<string | null> {
  if (!REDIS_ENABLED || !REDIS_URL) return Promise.resolve(null);
  return new Promise((resolve) => {
    execFile('redis-cli', ['-u', REDIS_URL, ...args], { timeout: 1000 }, (error, stdout) => {
      if (error) {
        logger.warn(JSON.stringify({ event: 'redis_cli_error', error: String(error), args }));
        resolve(null);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export async function redisIncrWithExpire(key: string, windowSec: number): Promise<number | null> {
  const script = [
    'local count = redis.call("INCR", KEYS[1])',
    'if count == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end',
    'local ttl = redis.call("TTL", KEYS[1])',
    'if ttl < 0 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end',
    'return count',
  ].join('; ');

  const countRaw = await runRedisCli(['--raw', 'EVAL', script, '1', key, String(windowSec)]);
  if (!countRaw) return null;
  const count = Number(countRaw.split('\n')[0]?.trim());
  return Number.isFinite(count) ? count : null;
}

export async function redisGet(key: string): Promise<string | null> {
  return runRedisCli(['GET', key]);
}

export async function redisSetEx(key: string, ttlSec: number, value: string): Promise<boolean> {
  const result = await runRedisCli(['SETEX', key, String(ttlSec), value]);
  return result === 'OK';
}

export async function redisDel(key: string): Promise<void> {
  await runRedisCli(['DEL', key]);
}

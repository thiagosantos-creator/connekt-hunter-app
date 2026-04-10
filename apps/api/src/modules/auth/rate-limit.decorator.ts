import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_CONFIG_KEY = 'rate-limit-config';

export type RateLimitConfig = {
  windowSec: number;
  maxRequests: number;
  scope: string;
};

export const RateLimit = (config: RateLimitConfig) => SetMetadata(RATE_LIMIT_CONFIG_KEY, config);

import { Injectable } from '@nestjs/common';
import type { IntegrationKey } from './integrations.types.js';

@Injectable()
export class IntegrationsConfigService {
  readonly environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'local';

  isIntegrationEnabled(key: IntegrationKey): boolean {
    const envKey = `FF_${key.toUpperCase().replace(/-/g, '_')}_REAL`;
    return process.env[envKey] === 'true';
  }

  selectedProvider(key: IntegrationKey): string {
    const envKey = `${key.toUpperCase().replace(/-/g, '_')}_PROVIDER`;
    return process.env[envKey] ?? 'auto';
  }

  shouldFallbackToMock(key: IntegrationKey): boolean {
    const envKey = `${key.toUpperCase().replace(/-/g, '_')}_FALLBACK_TO_MOCK`;
    return process.env[envKey] !== 'false';
  }

  isStagingLike(): boolean {
    return this.environment === 'staging' || this.environment === 'production';
  }
}

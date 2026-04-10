import { Injectable } from '@nestjs/common';
import type { IntegrationKey, IntegrationProvider } from './integrations.types.js';
import { IntegrationsConfigService } from './integrations-config.service.js';

@Injectable()
export class ProviderRegistryService {
  constructor(private readonly config: IntegrationsConfigService) {}

  resolvePreferredProvider<T extends IntegrationProvider>(
    integration: IntegrationKey,
    providers: T[],
  ): { primary: T; fallback?: T } {
    const preferred = this.config.selectedProvider(integration);
    const explicit = providers.find((provider) => provider.name === preferred);

    if (explicit) {
      const fallback = this.config.shouldFallbackToMock(integration)
        ? providers.find((provider) => provider.mode === 'mock' && provider.name !== explicit.name)
        : undefined;
      return { primary: explicit, fallback };
    }

    const realEnabled = this.config.isIntegrationEnabled(integration);
    const primary =
      (realEnabled ? providers.find((provider) => provider.mode === 'real' && provider.isAvailable) : undefined) ??
      providers.find((provider) => provider.mode === 'mock') ??
      providers[0];

    const fallback = this.config.shouldFallbackToMock(integration)
      ? providers.find((provider) => provider.mode === 'mock' && provider.name !== primary.name)
      : undefined;

    return { primary, fallback };
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IntegrationKey, IntegrationProvider } from './integrations.types.js';
import { IntegrationsConfigService } from './integrations-config.service.js';

@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger(ProviderRegistryService.name);

  constructor(@Inject(IntegrationsConfigService) private readonly config: IntegrationsConfigService) {}

  resolvePreferredProvider<T extends IntegrationProvider>(
    integration: IntegrationKey,
    providers: T[],
  ): { primary: T; fallback?: T } {
    if (!providers.length) {
      throw new Error(`No providers registered for integration: ${integration}`);
    }

    const preferred = this.config.selectedProvider(integration);
    const explicit = providers.find((provider) => provider.name === preferred);

    if (explicit) {
      const fallback = this.config.shouldFallbackToMock(integration)
        ? providers.find((provider) => provider.mode === 'mock' && provider.name !== explicit.name)
        : undefined;
      this.logSelection(integration, explicit, fallback, preferred ? 'explicit' : 'default');
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

    this.logSelection(integration, primary, fallback, realEnabled ? 'real_or_fallback' : 'mock_only');
    return { primary, fallback };
  }

  private logSelection(
    integration: IntegrationKey,
    primary: IntegrationProvider,
    fallback: IntegrationProvider | undefined,
    strategy: string,
  ) {
    this.logger.log(
      JSON.stringify({
        event: 'integration_provider_selected',
        integration,
        strategy,
        primary: primary.name,
        primaryMode: primary.mode,
        fallback: fallback?.name,
      }),
    );
  }
}

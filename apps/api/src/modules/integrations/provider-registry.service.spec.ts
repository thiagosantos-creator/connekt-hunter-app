import { describe, expect, it, vi } from 'vitest';
import { ProviderRegistryService } from './provider-registry.service.js';

describe('ProviderRegistryService', () => {
  const config = {
    selectedProvider: vi.fn(),
    shouldFallbackToMock: vi.fn(),
    isIntegrationEnabled: vi.fn(),
  };

  it('throws when provider list is empty', () => {
    const service = new ProviderRegistryService(config as never);
    expect(() => service.resolvePreferredProvider('ai', [])).toThrow(/No providers registered/);
  });

  it('returns real provider and mock fallback when enabled', () => {
    config.selectedProvider.mockReturnValue(undefined);
    config.shouldFallbackToMock.mockReturnValue(true);
    config.isIntegrationEnabled.mockReturnValue(true);

    const service = new ProviderRegistryService(config as never);
    const selection = service.resolvePreferredProvider('ai', [
      { name: 'ai-real', mode: 'real', isAvailable: true },
      { name: 'ai-mock', mode: 'mock', isAvailable: true },
    ] as never);

    expect(selection.primary.name).toBe('ai-real');
    expect(selection.fallback?.name).toBe('ai-mock');
  });
});

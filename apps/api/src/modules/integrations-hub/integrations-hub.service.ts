import { Injectable } from '@nestjs/common';

@Injectable()
export class IntegrationsHubService {
  getSummary() {
    return {
      module: 'integrations-hub',
      title: 'Integrations Hub',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/integrations-hub/spec.md',
      responsibilities: [
        'manter conex\u00f5es por provider',
        'persistir credenciais e settings',
        'padronizar jobs de sincroniza\u00e7\u00e3o',
      ],
    };
  }
}

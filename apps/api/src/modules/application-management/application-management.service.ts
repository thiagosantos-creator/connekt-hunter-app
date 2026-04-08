import { Injectable } from '@nestjs/common';

@Injectable()
export class ApplicationManagementService {
  getSummary() {
    return {
      module: 'application-management',
      title: 'Application Management',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/application-management/spec.md',
      responsibilities: [
        'abrir e atualizar candidaturas',
        'controlar est\u00e1gio do funil',
        'relacionar candidatura com shortlist e review',
      ],
    };
  }
}

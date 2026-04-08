import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditAdminService {
  getSummary() {
    return {
      module: 'audit-admin',
      title: 'Audit Admin',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/audit-admin/spec.md',
      responsibilities: [
        'registrar eventos audit\u00e1veis',
        'consultar trilha por entidade',
        'suportar investiga\u00e7\u00f5es e compliance',
      ],
    };
  }
}

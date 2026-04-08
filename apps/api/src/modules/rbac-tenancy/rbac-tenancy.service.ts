import { Injectable } from '@nestjs/common';

@Injectable()
export class RbacTenancyService {
  getSummary() {
    return {
      module: 'rbac-tenancy',
      title: 'RBAC Tenancy',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/rbac-tenancy/spec.md',
      responsibilities: [
        'resolver permiss\u00f5es por papel',
        'propagar contexto do tenant',
        'garantir isolamento de escopo administrativo',
      ],
    };
  }
}

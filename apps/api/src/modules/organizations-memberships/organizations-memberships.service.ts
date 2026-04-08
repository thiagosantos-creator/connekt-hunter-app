import { Injectable } from '@nestjs/common';

@Injectable()
export class OrganizationsMembershipsService {
  getSummary() {
    return {
      module: 'organizations-memberships',
      title: 'Organizations Memberships',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/organizations-memberships/spec.md',
      responsibilities: [
        'cadastro e lifecycle de organiza\u00e7\u00f5es',
        'v\u00ednculos de membros e perfis internos',
        'convites e ativa\u00e7\u00e3o futura por e-mail',
      ],
    };
  }
}

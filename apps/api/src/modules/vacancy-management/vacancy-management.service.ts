import { Injectable } from '@nestjs/common';

@Injectable()
export class VacancyManagementService {
  getSummary() {
    return {
      module: 'vacancy-management',
      title: 'Vacancy Management',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/vacancy-management/spec.md',
      responsibilities: [
        'criar e editar vagas',
        'versionar crit\u00e9rios e SLA operacional',
        'controlar status e prioriza\u00e7\u00e3o',
      ],
    };
  }
}

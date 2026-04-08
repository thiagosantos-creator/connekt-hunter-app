import { Injectable } from '@nestjs/common';

@Injectable()
export class VacancyPublishingService {
  getSummary() {
    return {
      module: 'vacancy-publishing',
      title: 'Vacancy Publishing',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/vacancy-publishing/spec.md',
      responsibilities: [
        'gerar slugs e links p\u00fablicos',
        'orquestrar canais de publica\u00e7\u00e3o',
        'medir estado de publica\u00e7\u00e3o por canal',
      ],
    };
  }
}

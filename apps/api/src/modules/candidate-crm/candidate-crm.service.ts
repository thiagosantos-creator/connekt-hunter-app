import { Injectable } from '@nestjs/common';

@Injectable()
export class CandidateCrmService {
  getSummary() {
    return {
      module: 'candidate-crm',
      title: 'Candidate CRM',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/candidate-crm/spec.md',
      responsibilities: [
        'perfil mestre do candidato',
        'timeline de intera\u00e7\u00f5es',
        'segmenta\u00e7\u00e3o futura para campanhas',
      ],
    };
  }
}

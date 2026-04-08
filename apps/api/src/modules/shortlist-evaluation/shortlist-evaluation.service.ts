import { Injectable } from '@nestjs/common';

@Injectable()
export class ShortlistEvaluationService {
  getSummary() {
    return {
      module: 'shortlist-evaluation',
      title: 'Shortlist Evaluation',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/shortlist-evaluation/spec.md',
      responsibilities: [
        'organizar shortlist por vaga',
        'manter ranking e status por item',
        'registrar scorecards internos',
      ],
    };
  }
}

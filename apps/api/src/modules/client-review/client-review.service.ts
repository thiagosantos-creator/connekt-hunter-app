import { Injectable } from '@nestjs/common';

@Injectable()
export class ClientReviewService {
  getSummary() {
    return {
      module: 'client-review',
      title: 'Client Review',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/client-review/spec.md',
      responsibilities: [
        'expor shortlist ao cliente',
        'coletar parecer e decis\u00e3o',
        'sincronizar devolutiva com opera\u00e7\u00e3o',
      ],
    };
  }
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class AiOrchestrationService {
  getSummary() {
    return {
      module: 'ai-orchestration',
      title: 'AI Orchestration',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/ai-orchestration/spec.md',
      responsibilities: [
        'gerenciar payloads de IA',
        'centralizar pol\u00edticas de fallback',
        'registrar custo e rastreabilidade futura',
      ],
    };
  }
}

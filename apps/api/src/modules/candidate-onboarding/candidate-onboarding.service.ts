import { Injectable } from '@nestjs/common';

@Injectable()
export class CandidateOnboardingService {
  getSummary() {
    return {
      module: 'candidate-onboarding',
      title: 'Candidate Onboarding',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/candidate-onboarding/spec.md',
      responsibilities: [
        'entrada por token ou vaga p\u00fablica',
        'controle do progresso do onboarding',
        'registro de consentimentos LGPD',
      ],
    };
  }
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class ResumeProcessingService {
  getSummary() {
    return {
      module: 'resume-processing',
      title: 'Resume Processing',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/resume-processing/spec.md',
      responsibilities: [
        'upload e storage de CV',
        'parsing com payloads flex\u00edveis',
        'revis\u00e3o humana dos dados extra\u00eddos',
      ],
    };
  }
}

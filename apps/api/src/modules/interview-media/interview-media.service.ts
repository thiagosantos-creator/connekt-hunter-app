import { Injectable } from '@nestjs/common';

@Injectable()
export class InterviewMediaService {
  getSummary() {
    return {
      module: 'interview-media',
      title: 'Interview Media',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/interview-media/spec.md',
      responsibilities: [
        'registrar assets de v\u00eddeo e \u00e1udio',
        'ligar m\u00eddia \u00e0 candidatura',
        'preparar integra\u00e7\u00e3o com S3 e players futuros',
      ],
    };
  }
}

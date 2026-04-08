import { Injectable } from '@nestjs/common';

@Injectable()
export class SmartInterviewService {
  getSummary() {
    return {
      module: 'smart-interview',
      title: 'Smart Interview',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/smart-interview/spec.md',
      responsibilities: [
        'instanciar sess\u00e3o e perguntas',
        'registrar respostas multimodais',
        'alimentar IA e transcri\u00e7\u00f5es',
      ],
    };
  }
}

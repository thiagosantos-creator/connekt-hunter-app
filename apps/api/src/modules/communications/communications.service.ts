import { Injectable } from '@nestjs/common';

@Injectable()
export class CommunicationsService {
  getSummary() {
    return {
      module: 'communications',
      title: 'Communications',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/communications/spec.md',
      responsibilities: [
        'modelar templates por canal',
        'registrar envios e eventos',
        'preparar SES, SNS e WhatsApp futuros',
      ],
    };
  }
}

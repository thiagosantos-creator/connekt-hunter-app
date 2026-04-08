import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkflowNotificationsService {
  getSummary() {
    return {
      module: 'workflow-notifications',
      title: 'Workflow Notifications',
      status: 'scaffolded' as const,
      specPath: 'docs/sdd/modules/workflow-notifications/spec.md',
      responsibilities: [
        'encadear notifica\u00e7\u00f5es por evento de dom\u00ednio',
        'agendar retries e compensa\u00e7\u00f5es',
        'separar regras de orquestra\u00e7\u00e3o do canal de envio',
      ],
    };
  }
}

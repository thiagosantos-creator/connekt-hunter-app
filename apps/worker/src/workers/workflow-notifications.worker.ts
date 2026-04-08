import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkflowNotificationsWorker {
  getJobSummary() {
    return {
      queue: 'workflow-notifications',
      status: 'scaffolded' as const,
      runbook: 'docs/sdd/modules/workflow-notifications/spec.md',
    };
  }
}

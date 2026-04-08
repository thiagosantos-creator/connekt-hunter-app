import { Injectable } from '@nestjs/common';

@Injectable()
export class IntegrationsHubWorker {
  getJobSummary() {
    return {
      queue: 'integrations-hub',
      status: 'scaffolded' as const,
      runbook: 'docs/sdd/modules/integrations-hub/spec.md',
    };
  }
}

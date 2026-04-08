import { Injectable } from '@nestjs/common';

@Injectable()
export class CommunicationsWorker {
  getJobSummary() {
    return {
      queue: 'communications',
      status: 'scaffolded' as const,
      runbook: 'docs/sdd/modules/communications/spec.md',
    };
  }
}

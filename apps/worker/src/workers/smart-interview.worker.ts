import { Injectable } from '@nestjs/common';

@Injectable()
export class SmartInterviewWorker {
  getJobSummary() {
    return {
      queue: 'smart-interview',
      status: 'scaffolded' as const,
      runbook: 'docs/sdd/modules/smart-interview/spec.md',
    };
  }
}

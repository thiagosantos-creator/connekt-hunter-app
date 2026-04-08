import { Injectable } from '@nestjs/common';

@Injectable()
export class ResumeProcessingWorker {
  getJobSummary() {
    return {
      queue: 'resume-processing',
      status: 'scaffolded' as const,
      runbook: 'docs/sdd/modules/resume-processing/spec.md',
    };
  }
}

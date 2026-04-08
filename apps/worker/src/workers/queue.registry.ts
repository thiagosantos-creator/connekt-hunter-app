import { Injectable } from '@nestjs/common';

@Injectable()
export class QueueRegistry {
  listQueues() {
    return [
      'resume-processing',
      'communications',
      'workflow-notifications',
      'smart-interview',
      'integrations-hub',
    ];
  }
}

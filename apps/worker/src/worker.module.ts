import { Module } from '@nestjs/common';

import { QueueRegistry } from './workers/queue.registry';
import { CommunicationsWorker } from './workers/communications.worker';
import { IntegrationsHubWorker } from './workers/integrations-hub.worker';
import { ResumeProcessingWorker } from './workers/resume-processing.worker';
import { SmartInterviewWorker } from './workers/smart-interview.worker';
import { WorkflowNotificationsWorker } from './workers/workflow-notifications.worker';

@Module({
  providers: [
    QueueRegistry,
    ResumeProcessingWorker,
    CommunicationsWorker,
    WorkflowNotificationsWorker,
    SmartInterviewWorker,
    IntegrationsHubWorker,
  ],
})
export class WorkerModule {}

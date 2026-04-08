import { Module } from '@nestjs/common';

import { WorkflowNotificationsController } from './workflow-notifications.controller';
import { WorkflowNotificationsService } from './workflow-notifications.service';

@Module({
  controllers: [WorkflowNotificationsController],
  providers: [WorkflowNotificationsService],
  exports: [WorkflowNotificationsService],
})
export class WorkflowNotificationsModule {}

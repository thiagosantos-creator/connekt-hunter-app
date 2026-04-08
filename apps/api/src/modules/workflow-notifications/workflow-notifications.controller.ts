import { Controller, Get } from '@nestjs/common';

import { WorkflowNotificationsService } from './workflow-notifications.service';

@Controller('workflow-notifications')
export class WorkflowNotificationsController {
  constructor(private readonly service: WorkflowNotificationsService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

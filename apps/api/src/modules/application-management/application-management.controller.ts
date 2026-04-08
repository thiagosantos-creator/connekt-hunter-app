import { Controller, Get } from '@nestjs/common';

import { ApplicationManagementService } from './application-management.service';

@Controller('application-management')
export class ApplicationManagementController {
  constructor(private readonly service: ApplicationManagementService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

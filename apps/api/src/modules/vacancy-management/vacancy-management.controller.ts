import { Controller, Get } from '@nestjs/common';

import { VacancyManagementService } from './vacancy-management.service';

@Controller('vacancy-management')
export class VacancyManagementController {
  constructor(private readonly service: VacancyManagementService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

import { Controller, Get } from '@nestjs/common';

import { VacancyPublishingService } from './vacancy-publishing.service';

@Controller('vacancy-publishing')
export class VacancyPublishingController {
  constructor(private readonly service: VacancyPublishingService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

import { Controller, Get } from '@nestjs/common';

import { CommunicationsService } from './communications.service';

@Controller('communications')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

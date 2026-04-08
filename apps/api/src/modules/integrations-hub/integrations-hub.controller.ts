import { Controller, Get } from '@nestjs/common';

import { IntegrationsHubService } from './integrations-hub.service';

@Controller('integrations-hub')
export class IntegrationsHubController {
  constructor(private readonly service: IntegrationsHubService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

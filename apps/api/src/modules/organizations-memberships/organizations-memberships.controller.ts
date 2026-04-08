import { Controller, Get } from '@nestjs/common';

import { OrganizationsMembershipsService } from './organizations-memberships.service';

@Controller('organizations-memberships')
export class OrganizationsMembershipsController {
  constructor(private readonly service: OrganizationsMembershipsService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

import { Controller, Get } from '@nestjs/common';

import { RbacTenancyService } from './rbac-tenancy.service';

@Controller('rbac-tenancy')
export class RbacTenancyController {
  constructor(private readonly service: RbacTenancyService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

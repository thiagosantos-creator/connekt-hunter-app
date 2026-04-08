import { Controller, Get } from '@nestjs/common';

import { AuditAdminService } from './audit-admin.service';

@Controller('audit-admin')
export class AuditAdminController {
  constructor(private readonly service: AuditAdminService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

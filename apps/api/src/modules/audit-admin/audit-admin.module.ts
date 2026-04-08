import { Module } from '@nestjs/common';

import { AuditAdminController } from './audit-admin.controller';
import { AuditAdminService } from './audit-admin.service';

@Module({
  controllers: [AuditAdminController],
  providers: [AuditAdminService],
  exports: [AuditAdminService],
})
export class AuditAdminModule {}

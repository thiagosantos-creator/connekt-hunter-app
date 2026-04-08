import { Module } from '@nestjs/common';

import { ApplicationManagementController } from './application-management.controller';
import { ApplicationManagementService } from './application-management.service';

@Module({
  controllers: [ApplicationManagementController],
  providers: [ApplicationManagementService],
  exports: [ApplicationManagementService],
})
export class ApplicationManagementModule {}

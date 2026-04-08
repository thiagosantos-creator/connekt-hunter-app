import { Module } from '@nestjs/common';

import { VacancyManagementController } from './vacancy-management.controller';
import { VacancyManagementService } from './vacancy-management.service';

@Module({
  controllers: [VacancyManagementController],
  providers: [VacancyManagementService],
  exports: [VacancyManagementService],
})
export class VacancyManagementModule {}

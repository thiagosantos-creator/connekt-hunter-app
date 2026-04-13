import { Module } from '@nestjs/common';
import { ExecutiveDashboardController } from './executive-dashboard.controller.js';
import { ExecutiveDashboardService } from './executive-dashboard.service.js';

@Module({
  controllers: [ExecutiveDashboardController],
  providers: [ExecutiveDashboardService],
})
export class ExecutiveDashboardModule {}

import { Module } from '@nestjs/common';
import { HeadhunterDashboardService } from './headhunter-dashboard.service.js';
import { HeadhunterDashboardController } from './headhunter-dashboard.controller.js';
import { PrismaModule } from '../integrations/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [HeadhunterDashboardService],
  controllers: [HeadhunterDashboardController],
  exports: [HeadhunterDashboardService],
})
export class HeadhunterDashboardModule {}

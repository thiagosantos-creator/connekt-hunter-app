import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { HeadhunterDashboardService } from './headhunter-dashboard.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('headhunter-dashboard')
@UseGuards(JwtAuthGuard)
export class HeadhunterDashboardController {
  constructor(private dashboardService: HeadhunterDashboardService) {}

  @Get('metrics')
  async getMetrics(
    @CurrentUser() user: any,
    @Query('days') days?: string,
    @Query('organizationId') organizationId?: string,
    @Query('vacancyId') vacancyId?: string,
  ) {
    const periodDays = parseInt(days || '7', 10);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - periodDays);

    // If user is not superadmin, enforce their organization
    // For now, assuming current strategy is organization-scoped
    const targetOrgId = organizationId || user.organizationId;

    return this.dashboardService.getMetrics({
      organizationId: targetOrgId,
      startDate,
      endDate,
      vacancyId,
    });
  }
}

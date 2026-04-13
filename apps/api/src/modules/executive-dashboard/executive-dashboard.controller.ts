import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ExecutiveDashboardService } from './executive-dashboard.service.js';

@Controller('enterprise/executive-dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExecutiveDashboardController {
  constructor(@Inject(ExecutiveDashboardService) private readonly service: ExecutiveDashboardService) {}

  @Get(':organizationId')
  @RequirePermissions('executive-dashboard:read')
  getDashboard(
    @Param('organizationId') organizationId: string,
    @Query('period') period: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getDashboard(organizationId, user.id, user.role, period ?? 'weekly');
  }

  @Get(':organizationId/export.csv')
  @RequirePermissions('executive-dashboard:read')
  async exportCsv(@Param('organizationId') organizationId: string, @CurrentUser() user: AuthUser) {
    const rows = await this.service.exportCsv(organizationId, user.id, user.role);
    return { csv: rows };
  }
}

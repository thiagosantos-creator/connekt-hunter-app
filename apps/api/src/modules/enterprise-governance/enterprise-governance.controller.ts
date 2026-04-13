import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { EnterpriseGovernanceService, type TenantSettingsPayload } from './enterprise-governance.service.js';

@Controller('enterprise/tenant-admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EnterpriseGovernanceController {
  constructor(private readonly service: EnterpriseGovernanceService) {}

  @Get(':organizationId')
  @RequirePermissions('tenant-admin:manage')
  getSettings(@Param('organizationId') organizationId: string, @CurrentUser() user: AuthUser) {
    return this.service.getSettings(organizationId, user.id, user.role);
  }

  @Get(':organizationId/history')
  @RequirePermissions('tenant-admin:manage')
  getHistory(@Param('organizationId') organizationId: string, @CurrentUser() user: AuthUser) {
    return this.service.getHistory(organizationId, user.id, user.role);
  }

  @Put(':organizationId')
  @RequirePermissions('tenant-admin:manage')
  updateSettings(@Param('organizationId') organizationId: string, @Body() body: TenantSettingsPayload, @CurrentUser() user: AuthUser) {
    return this.service.upsertSettings(organizationId, user.id, user.role, body);
  }
}

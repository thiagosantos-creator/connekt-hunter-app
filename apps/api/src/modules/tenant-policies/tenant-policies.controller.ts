import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { TenantPoliciesService } from './tenant-policies.service.js';

@Controller('tenant-policies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantPoliciesController {
  constructor(private readonly service: TenantPoliciesService) {}

  @Get(':organizationId')
  @RequirePermissions('users:manage')
  get(@Param('organizationId') organizationId: string, @CurrentUser() user: AuthUser) {
    return this.service.getByOrganization(organizationId, user.id, user.role);
  }

  @Put(':organizationId')
  @RequirePermissions('users:manage')
  update(
    @Param('organizationId') organizationId: string,
    @Body() body: { canInviteCandidates: boolean; canApproveDecisions: boolean; canAuditEvents: boolean; canAdministrateTenant: boolean },
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.upsertByOrganization(organizationId, user.id, user.role, body);
  }
}

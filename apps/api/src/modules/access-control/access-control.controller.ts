import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { AccessControlService, type PermissionRuleInput } from './access-control.service.js';

@Controller('enterprise/access-control')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccessControlController {
  constructor(private readonly service: AccessControlService) {}

  @Get(':organizationId/policies')
  @RequirePermissions('access-control:manage')
  listPolicies(@Param('organizationId') organizationId: string, @CurrentUser() user: AuthUser) {
    return this.service.listPolicies(organizationId, user.id, user.role);
  }

  @Post(':organizationId/policies')
  @RequirePermissions('access-control:manage')
  upsertPolicy(@Param('organizationId') organizationId: string, @Body() body: { roleKey: string; rules: PermissionRuleInput[] }, @CurrentUser() user: AuthUser) {
    return this.service.upsertPolicy(organizationId, user.id, user.role, body.roleKey, body.rules);
  }

  @Post(':organizationId/grants')
  @RequirePermissions('access-control:manage')
  grantTemporary(@Param('organizationId') organizationId: string, @Body() body: { userId: string; resource: string; action: string; scope: string; expiresAt: string }, @CurrentUser() user: AuthUser) {
    return this.service.createTemporaryGrant(organizationId, user.id, user.role, body);
  }

  @Post(':organizationId/simulate')
  @RequirePermissions('access-control:manage')
  simulate(@Param('organizationId') organizationId: string, @Body() body: { roleKey: string; resource: string; action: string; scope: string }, @CurrentUser() user: AuthUser) {
    return this.service.simulateAccess(organizationId, user.id, user.role, body);
  }
}

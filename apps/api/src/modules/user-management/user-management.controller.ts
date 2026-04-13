import { Body, Controller, Get, Inject, Param, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { UserManagementService } from './user-management.service.js';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserManagementController {
  constructor(@Inject(UserManagementService) private readonly service: UserManagementService) {}

  @Get()
  @RequirePermissions('users:manage')
  list(@Query('organizationId') organizationId: string, @CurrentUser() user: AuthUser) {
    return this.service.list(organizationId, user.id, user.role);
  }

  @Put(':userId')
  @RequirePermissions('users:manage')
  update(
    @Param('userId') userId: string,
    @Body() body: { organizationId: string; role?: 'admin' | 'headhunter' | 'client'; isActive?: boolean },
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(body.organizationId, userId, user.id, user.role, {
      role: body.role,
      isActive: body.isActive,
    });
  }
}

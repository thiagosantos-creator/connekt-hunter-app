import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { HeadhunterInboxService } from './headhunter-inbox.service.js';

@Controller('headhunter-inbox')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HeadhunterInboxController {
  constructor(@Inject(HeadhunterInboxService) private readonly service: HeadhunterInboxService) {}

  @Get()
  @RequirePermissions('applications:read')
  list(
    @Query('organizationId') organizationId: string,
    @Query('vacancyId') vacancyId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('priority') priority: 'high' | 'medium' | 'low' | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.list(user.id, user.role, { organizationId, vacancyId, status, priority });
  }
}

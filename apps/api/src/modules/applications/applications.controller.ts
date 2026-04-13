import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';

@Controller('applications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApplicationsController {
  constructor(@Inject(ApplicationsService) private readonly applicationsService: ApplicationsService) {}

  @Get()
  @RequirePermissions('applications:read')
  findAll(@CurrentUser() user: AuthUser) {
    return this.applicationsService.findAll(user.organizationIds ?? [], user.role);
  }

  @Get(':applicationId')
  @RequirePermissions('applications:read')
  findById(@Param('applicationId') applicationId: string, @CurrentUser() user: AuthUser) {
    return this.applicationsService.findById(applicationId, user.organizationIds ?? [], user.role);
  }
}

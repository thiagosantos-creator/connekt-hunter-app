import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly organizationsService: OrganizationsService) {}

  @Post()
  @RequirePermissions('users:manage')
  create(@Body() body: { name: string; status?: string; ownerAdminUserId?: string }, @CurrentUser() user: AuthUser) {
    return this.organizationsService.create(body, user.id);
  }

  @Get()
  @RequirePermissions('users:manage')
  findAll() {
    return this.organizationsService.findAll();
  }
}

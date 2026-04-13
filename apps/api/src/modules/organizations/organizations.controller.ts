import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @RequirePermissions('vacancies:write')
  create(@Body() body: { name: string; status?: string; ownerAdminUserId?: string }, @CurrentUser() user: AuthUser) {
    return this.organizationsService.create(body, user.id);
  }

  @Get()
  @RequirePermissions('vacancies:read')
  findAll() {
    return this.organizationsService.findAll();
  }
}

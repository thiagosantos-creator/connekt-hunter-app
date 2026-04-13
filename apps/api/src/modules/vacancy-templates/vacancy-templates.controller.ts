import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { VacancyTemplatesService } from './vacancy-templates.service.js';

@Controller('vacancy-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VacancyTemplatesController {
  constructor(@Inject(VacancyTemplatesService) private readonly service: VacancyTemplatesService) {}

  @Post()
  @RequirePermissions('vacancies:write')
  create(@Body() body: {
    organizationId: string;
    name: string;
    sector: string;
    role: string;
    status?: 'draft' | 'active' | 'archived';
    isFavorite?: boolean;
    defaultFields: Record<string, unknown>;
  }, @CurrentUser() user: AuthUser) {
    return this.service.create(user.id, body);
  }

  @Get()
  @RequirePermissions('vacancies:read')
  list(@CurrentUser() user: AuthUser) {
    return this.service.listForUser(user.id, user.role, user.organizationIds);
  }

  @Patch(':id')
  @RequirePermissions('vacancies:write')
  update(@Param('id') id: string, @Body() body: Partial<{
    name: string;
    sector: string;
    role: string;
    status: 'draft' | 'active' | 'archived';
    isFavorite: boolean;
    defaultFields: Record<string, unknown>;
  }>, @CurrentUser() user: AuthUser) {
    return this.service.update(user.id, id, body);
  }

  @Post(':id/apply')
  @RequirePermissions('vacancies:write')
  apply(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.applyTemplate(user.id, id);
  }
}

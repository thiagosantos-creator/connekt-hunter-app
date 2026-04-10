import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { VacanciesService } from './vacancies.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';

@Controller('vacancies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VacanciesController {
  constructor(private readonly vacanciesService: VacanciesService) {}

  @Post()
  @RequirePermissions('vacancies:write')
  create(@Body() body: { organizationId: string; title: string; description: string }, @CurrentUser() user: AuthUser) {
    return this.vacanciesService.create({ ...body, createdBy: user.id });
  }

  @Get()
  @RequirePermissions('vacancies:read')
  findAll(@CurrentUser() user: AuthUser) {
    return this.vacanciesService.findAll(user.organizationIds, user.role);
  }
}

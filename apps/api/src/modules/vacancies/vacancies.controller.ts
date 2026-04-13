import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { VacanciesService } from './vacancies.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';

@Controller('vacancies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VacanciesController {
  constructor(@Inject(VacanciesService) private readonly vacanciesService: VacanciesService) {}

  @Post()
  @RequirePermissions('vacancies:write')
  create(@Body() body: {
    organizationId: string;
    title: string;
    description: string;
    location?: string;
    workModel?: string;
    seniority?: string;
    sector?: string;
    experienceYearsMin?: number;
    experienceYearsMax?: number;
    employmentType?: string;
    publicationType?: string;
    status?: string;
    department?: string;
    requiredSkills?: string[];
    desiredSkills?: string[];
    salaryMin?: number;
    salaryMax?: number;
  }, @CurrentUser() user: AuthUser) {
    return this.vacanciesService.create({ ...body, createdBy: user.id });
  }

  @Get()
  @RequirePermissions('vacancies:read')
  findAll(@CurrentUser() user: AuthUser) {
    return this.vacanciesService.findAll(user.organizationIds, user.role);
  }

  @Post('assist-content')
  @RequirePermissions('vacancies:write')
  assist(@Body() body: {
    title: string;
    seniority: string;
    sector: string;
    workModel?: string;
    location?: string;
  }) {
    return this.vacanciesService.generateAssistiveContent(body);
  }
}

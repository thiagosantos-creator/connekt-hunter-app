import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RiskAnalysisService } from './risk-analysis.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

@Controller('risk-analysis')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RiskAnalysisController {
  constructor(private readonly service: RiskAnalysisService) {}

  @Post('analyze')
  @RequirePermissions('applications:read')
  analyze(@Body() body: { candidateId: string; vacancyId: string }, @CurrentUser() user: { id: string }) {
    return this.service.analyze(body.candidateId, body.vacancyId, user.id);
  }

  @Get()
  @RequirePermissions('applications:read')
  get(@Query('candidateId') candidateId: string, @Query('vacancyId') vacancyId: string) {
    return this.service.get(candidateId, vacancyId);
  }
}

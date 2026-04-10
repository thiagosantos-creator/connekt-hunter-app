import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CandidateInsightsService } from './candidate-insights.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

@Controller('candidate-insights')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CandidateInsightsController {
  constructor(private readonly service: CandidateInsightsService) {}

  @Post('generate')
  @RequirePermissions('applications:read')
  generate(@Body() body: { candidateId: string; vacancyId: string }, @CurrentUser() user: { id: string }) {
    return this.service.generate(body.candidateId, body.vacancyId, user.id);
  }

  @Get(':vacancyId/:candidateId')
  @RequirePermissions('applications:read')
  get(@Param('vacancyId') vacancyId: string, @Param('candidateId') candidateId: string) {
    return this.service.get(candidateId, vacancyId);
  }
}

import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { RecommendationEngineService } from './recommendation-engine.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

@Controller('recommendation-engine')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecommendationEngineController {
  constructor(@Inject(RecommendationEngineService) private readonly service: RecommendationEngineService) {}

  @Post('generate')
  @RequirePermissions('applications:read')
  generate(@Body() body: { candidateId: string; vacancyId: string }, @CurrentUser() user: { id: string }) {
    return this.service.generate(body.candidateId, body.vacancyId, user.id);
  }

  @Get(':vacancyId')
  @RequirePermissions('applications:read')
  list(@Param('vacancyId') vacancyId: string, @CurrentUser() user: { id: string }) {
    return this.service.list(vacancyId, user.id);
  }
}

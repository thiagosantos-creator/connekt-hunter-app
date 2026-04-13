import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { CandidateRankingService } from './candidate-ranking.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

@Controller('candidate-ranking')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CandidateRankingController {
  constructor(@Inject(CandidateRankingService) private readonly service: CandidateRankingService) {}

  @Post('generate')
  @RequirePermissions('applications:read')
  generate(@Body() body: { vacancyId: string }, @CurrentUser() user: { id: string }) {
    return this.service.generate(body.vacancyId, user.id);
  }

  @Get(':vacancyId')
  @RequirePermissions('applications:read')
  list(@Param('vacancyId') vacancyId: string) {
    return this.service.list(vacancyId);
  }

  @Post('override')
  @RequirePermissions('shortlist:write')
  override(@Body() body: { vacancyId: string; orderedCandidateIds: string[] }, @CurrentUser() user: { id: string }) {
    return this.service.override(body.vacancyId, body.orderedCandidateIds, user.id);
  }
}

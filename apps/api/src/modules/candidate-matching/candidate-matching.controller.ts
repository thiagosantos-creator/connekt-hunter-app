import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { CandidateMatchingService } from './candidate-matching.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

@Controller('candidate-matching')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CandidateMatchingController {
  constructor(@Inject(CandidateMatchingService) private readonly service: CandidateMatchingService) {}

  @Post('compute')
  @RequirePermissions('applications:read')
  compute(@Body() body: { applicationId: string }, @CurrentUser() user: { id: string }) {
    return this.service.computeMatching(body.applicationId, user.id);
  }

  @Get(':vacancyId/:candidateId')
  @RequirePermissions('applications:read')
  get(@Param('vacancyId') vacancyId: string, @Param('candidateId') candidateId: string) {
    return this.service.getMatching(candidateId, vacancyId);
  }

  @Post('compare')
  @RequirePermissions('applications:read')
  compare(@Body() body: { vacancyId: string; leftCandidateId: string; rightCandidateId: string }, @CurrentUser() user: { id: string }) {
    return this.service.compareCandidates(body.vacancyId, body.leftCandidateId, body.rightCandidateId, user.id);
  }
}

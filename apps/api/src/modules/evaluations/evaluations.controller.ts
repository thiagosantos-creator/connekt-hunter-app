import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { EvaluationsService } from './evaluations.service.js';

@Controller('evaluations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EvaluationsController {
  constructor(@Inject(EvaluationsService) private readonly evaluationsService: EvaluationsService) {}

  @Post()
  @RequirePermissions('shortlist:write')
  create(
    @Body()
    body: {
      applicationId: string;
      comment: string;
      ratingTechnical?: number;
      ratingBehavioral?: number;
      ratingInterviewer?: number;
      ratingAi?: number;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.evaluationsService.create(body.applicationId, user.id, body.comment, {
      ratingTechnical: body.ratingTechnical,
      ratingBehavioral: body.ratingBehavioral,
      ratingInterviewer: body.ratingInterviewer,
      ratingAi: body.ratingAi,
    });
  }
}

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';

@Controller('evaluations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post()
  @RequirePermissions('shortlist:write')
  create(@Body() body: { applicationId: string; comment: string }, @CurrentUser() user: AuthUser) {
    return this.evaluationsService.create(body.applicationId, user.id, body.comment);
  }
}

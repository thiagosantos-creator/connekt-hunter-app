import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { DecisionEngineService } from './decision-engine.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

@Controller('decision-engine')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DecisionEngineController {
  constructor(@Inject(DecisionEngineService) private readonly service: DecisionEngineService) {}

  @Post('priority/calculate')
  @RequirePermissions('applications:read')
  calculate(@Body() body: { vacancyId: string }, @CurrentUser() user: { id: string }) {
    return this.service.calculatePriority(body.vacancyId, user.id);
  }
}

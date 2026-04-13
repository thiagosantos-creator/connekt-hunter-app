import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { WorkflowAutomationService } from './workflow-automation.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

@Controller('workflow-automation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkflowAutomationController {
  constructor(@Inject(WorkflowAutomationService) private readonly service: WorkflowAutomationService) {}

  @Post('suggest')
  @RequirePermissions('applications:read')
  suggest(@Body() body: { candidateId: string; vacancyId: string }, @CurrentUser() user: { id: string }) {
    return this.service.suggest(body.candidateId, body.vacancyId, user.id);
  }

  @Post('execute')
  @RequirePermissions('shortlist:write')
  execute(@Body() body: { suggestionId: string }, @CurrentUser() user: { id: string }) {
    return this.service.execute(body.suggestionId, user.id);
  }
}

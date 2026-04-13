import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { InviteFollowUpService } from './invite-follow-up.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';

@Controller('invite-follow-up-cadences')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InviteFollowUpController {
  constructor(@Inject(InviteFollowUpService) private readonly service: InviteFollowUpService) {}

  @Post()
  @RequirePermissions('candidates:invite')
  configure(@Body() body: {
    organizationId: string;
    vacancyId: string;
    candidateId: string;
    applicationId?: string;
    steps?: Array<{ stepKey: string; daysAfterInvite: number; channel: string }>;
  }, @CurrentUser() user: AuthUser) {
    return this.service.configure(user.id, body);
  }

  @Get()
  @RequirePermissions('candidates:invite')
  list(@Query('organizationId') organizationId: string, @CurrentUser() user: AuthUser) {
    return this.service.listByOrganization(user.id, user.role, organizationId);
  }

  @Patch(':cadenceId/:action')
  @RequirePermissions('candidates:invite')
  status(@Param('cadenceId') cadenceId: string, @Param('action') action: 'pause' | 'resume' | 'cancel', @CurrentUser() user: AuthUser) {
    return this.service.updateStatus(user.id, cadenceId, action);
  }
}

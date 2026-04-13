import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ClientDecisionsService } from './client-decisions.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';

@Controller('client-decisions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientDecisionsController {
  constructor(private readonly clientDecisionsService: ClientDecisionsService) {}

  @Get()
  @RequirePermissions('decision:read')
  findAll(@CurrentUser() user: AuthUser) {
    return this.clientDecisionsService.findAll(user.organizationIds, user.role);
  }

  @Post()
  @RequirePermissions('decision:write')
  create(@Body() body: { shortlistItemId: string; decision: string }, @CurrentUser() user: AuthUser) {
    return this.clientDecisionsService.create(body.shortlistItemId, user.id, body.decision);
  }
}

import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ClientDecisionsService } from './client-decisions.service.js';
import { PublicTokenGuard } from '../auth/public-token.guard.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';
import { RateLimit } from '../auth/rate-limit.decorator.js';

@Controller('client-decisions')
export class ClientDecisionsController {
  constructor(@Inject(ClientDecisionsService) private readonly clientDecisionsService: ClientDecisionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('decision:read')
  findAll(@CurrentUser() user: AuthUser) {
    return this.clientDecisionsService.findAll(user.organizationIds, user.role);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('decision:write')
  create(@Body() body: { shortlistItemId: string; decision: string }, @CurrentUser() user: AuthUser) {
    return this.clientDecisionsService.create(body.shortlistItemId, user.id, body.decision);
  }

  @Post('public')
  @UseGuards(RateLimitGuard, PublicTokenGuard)
  @RateLimit({ scope: 'public-decision', windowSec: 60, maxRequests: 20 })
  createPublic(@Body() body: { shortlistItemId: string; decision: string; token: string }) {
    return this.clientDecisionsService.createPublic(body.shortlistItemId, body.token, body.decision);
  }
}

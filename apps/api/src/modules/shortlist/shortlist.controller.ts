import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ShortlistService } from './shortlist.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';

@Controller('shortlist')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShortlistController {
  constructor(private readonly shortlistService: ShortlistService) {}

  @Post()
  @RequirePermissions('shortlist:write')
  add(@Body() body: { applicationId: string }, @CurrentUser() user: AuthUser) {
    return this.shortlistService.addToShortlist(body.applicationId, user.id);
  }

  @Get('items')
  @RequirePermissions('shortlist:read')
  getItems(@CurrentUser() user: AuthUser) {
    return this.shortlistService.findShortlistedApplications(user.organizationIds, user.role);
  }
}

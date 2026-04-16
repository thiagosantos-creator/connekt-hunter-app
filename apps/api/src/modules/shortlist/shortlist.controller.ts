import { Body, Controller, Delete, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ShortlistService } from './shortlist.service.js';
import { PublicTokenGuard } from '../auth/public-token.guard.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';
import { RateLimit } from '../auth/rate-limit.decorator.js';

@Controller('shortlist')
export class ShortlistController {
  constructor(@Inject(ShortlistService) private readonly shortlistService: ShortlistService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('shortlist:write')
  add(@Body() body: { applicationId: string }, @CurrentUser() user: AuthUser) {
    return this.shortlistService.addToShortlist(body.applicationId, user.id);
  }

  @Get('items')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('shortlist:read')
  getItems(@CurrentUser() user: AuthUser) {
    return this.shortlistService.findShortlistedApplications(user.organizationIds, user.role);
  }

  @Delete('items/:itemId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('shortlist:write')
  remove(@Param('itemId') itemId: string, @CurrentUser() user: AuthUser) {
    return this.shortlistService.removeFromShortlist(itemId, user.id);
  }

  @Post('review-link')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('shortlist:write')
  createReviewLink(@Body() body: { vacancyId: string }, @CurrentUser() user: AuthUser) {
    return this.shortlistService.createReviewLink(body.vacancyId, user.id);
  }

  @Get('public/:token')
  @UseGuards(RateLimitGuard, PublicTokenGuard)
  @RateLimit({ scope: 'public-review', windowSec: 60, maxRequests: 30 })
  getPublicShortlist(@Param('token') token: string) {
    return this.shortlistService.findPublicShortlist(token);
  }
}

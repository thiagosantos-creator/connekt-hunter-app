import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CandidatesService } from './candidates.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';
import { PublicTokenGuard } from '../auth/public-token.guard.js';

@Controller()
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post('candidates/invite')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('candidates:invite')
  invite(@Body() body: { organizationId: string; email: string; vacancyId: string }, @CurrentUser() user: AuthUser) {
    return this.candidatesService.invite(body.organizationId, emailSanitize(body.email), body.vacancyId, user.id);
  }

  @Get('candidate/token/:token')
  @UseGuards(RateLimitGuard, PublicTokenGuard)
  byToken(@Param('token') token: string) {
    return this.candidatesService.byToken(token);
  }
}

function emailSanitize(value: string): string {
  return value.trim().toLowerCase();
}

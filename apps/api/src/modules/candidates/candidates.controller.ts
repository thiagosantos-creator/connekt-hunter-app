import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CandidatesService } from './candidates.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';
import { RateLimit } from '../auth/rate-limit.decorator.js';
import { PublicTokenGuard } from '../auth/public-token.guard.js';

@Controller()
export class CandidatesController {
  constructor(@Inject(CandidatesService) private readonly candidatesService: CandidatesService) {}

  @Post('candidates/invite')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('candidates:invite')
  invite(
    @Body() body: {
      organizationId: string;
      vacancyId: string;
      channel: 'email' | 'phone' | 'link';
      destination?: string;
      consent: boolean;
    },
    @CurrentUser() user: AuthUser,
  ) {
    const destination = body.channel === 'link'
      ? 'manual'
      : sanitizeDestination(body.channel, body.destination ?? '');
    return this.candidatesService.invite({
      organizationId: body.organizationId,
      vacancyId: body.vacancyId,
      channel: body.channel,
      destination,
      consent: body.consent,
      actorUserId: user.id,
    });
  }

  @Get('candidates/invites')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('candidates:invite')
  invites(@Query('organizationId') organizationId: string, @CurrentUser() user: AuthUser) {
    return this.candidatesService.listInvites(organizationId, user.id, user.role);
  }

  @Get('candidate/token/:token')
  @UseGuards(RateLimitGuard, PublicTokenGuard)
  @RateLimit({ scope: 'candidate-token', windowSec: 60, maxRequests: 20 })
  byToken(@Param('token') token: string) {
    return this.candidatesService.byToken(token);
  }
}

function sanitizeDestination(channel: 'email' | 'phone', value: string): string {
  const normalized = value.trim();
  if (channel === 'email') return normalized.toLowerCase();
  return normalized.replace(/\s+/g, '');
}

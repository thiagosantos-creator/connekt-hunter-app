import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ClientCommentsService } from './client-comments.service.js';

@Controller('client-comments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientCommentsController {
  constructor(@Inject(ClientCommentsService) private readonly clientCommentsService: ClientCommentsService) {}

  @Post()
  @RequirePermissions('decision:write')
  create(
    @Body() body: { applicationId: string; comment: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.clientCommentsService.create({
      applicationId: body.applicationId,
      comment: body.comment,
      reviewerId: user.id,
    });
  }

  @Get(':applicationId')
  @RequirePermissions('decision:read')
  findByApplication(@Param('applicationId') applicationId: string, @CurrentUser() user: AuthUser) {
    return this.clientCommentsService.findByApplication(applicationId, user.organizationIds ?? [], user.role);
  }
}

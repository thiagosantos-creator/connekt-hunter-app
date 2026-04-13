import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CommunicationCenterService } from './communication-center.service.js';

@Controller('enterprise/communications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommunicationCenterController {
  constructor(private readonly service: CommunicationCenterService) {}

  @Get(':organizationId/templates')
  @RequirePermissions('communications:manage')
  listTemplates(@Param('organizationId') organizationId: string, @CurrentUser() user: AuthUser) {
    return this.service.listTemplates(organizationId, user.id, user.role);
  }

  @Post(':organizationId/templates')
  @RequirePermissions('communications:manage')
  createTemplate(@Param('organizationId') organizationId: string, @Body() body: { name: string; type: string; channel: string; placeholders: string[]; content: string }, @CurrentUser() user: AuthUser) {
    return this.service.createTemplate(organizationId, user.id, user.role, body);
  }

  @Put(':organizationId/templates/:templateId/publish')
  @RequirePermissions('communications:manage')
  publishVersion(@Param('organizationId') organizationId: string, @Param('templateId') templateId: string, @CurrentUser() user: AuthUser) {
    return this.service.publishTemplateVersion(organizationId, user.id, user.role, templateId);
  }

  @Post(':organizationId/dispatch')
  @RequirePermissions('communications:manage')
  dispatch(@Param('organizationId') organizationId: string, @Body() body: { templateId: string; recipient: string; eventKey: string; idempotencyKey: string }, @CurrentUser() user: AuthUser) {
    return this.service.dispatchTemplate(organizationId, user.id, user.role, body);
  }

  @Get(':organizationId/dispatch-audit')
  @RequirePermissions('communications:manage')
  dispatchAudit(@Param('organizationId') organizationId: string, @CurrentUser() user: AuthUser) {
    return this.service.dispatchAudit(organizationId, user.id, user.role);
  }
}

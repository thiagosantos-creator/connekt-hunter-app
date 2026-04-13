import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { NotificationPreferencesService, type NotificationPreferencesPayload } from './notification-preferences.service.js';

@Controller('notification-preferences')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationPreferencesController {
  constructor(@Inject(NotificationPreferencesService) private readonly service: NotificationPreferencesService) {}

  @Get('me')
  get(@CurrentUser() user: AuthUser) {
    return this.service.getByUser(user.id);
  }

  @Get('me/dispatches')
  dispatches(@CurrentUser() user: AuthUser) {
    return this.service.listDispatchesByUser(user.id);
  }

  @Put('me')
  update(
    @CurrentUser() user: AuthUser,
    @Body() body: NotificationPreferencesPayload,
  ) {
    return this.service.updateByUser(user.id, body);
  }
}

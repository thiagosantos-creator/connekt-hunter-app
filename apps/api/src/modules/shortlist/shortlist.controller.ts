import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ShortlistService } from './shortlist.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';

@Controller('shortlist')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShortlistController {
  constructor(private readonly shortlistService: ShortlistService) {}

  @Post()
  @RequirePermissions('shortlist:write')
  add(@Body() body: { applicationId: string }) {
    return this.shortlistService.addToShortlist(body.applicationId);
  }
}

import { Body, Controller, Get, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly organizationsService: OrganizationsService) {}

  @Post()
  @RequirePermissions('users:manage')
  create(@Body() body: { name: string; status?: string; ownerAdminUserId?: string }, @CurrentUser() user: AuthUser) {
    return this.organizationsService.create(body, user.id);
  }

  @Put(':organizationId')
  @RequirePermissions('users:manage')
  update(
    @Param('organizationId') organizationId: string,
    @Body()
    body: {
      name?: string;
      status?: string;
      ownerAdminUserId?: string;
      branding?: {
        logoUrl?: string;
        bannerUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        publicName?: string;
        communicationDomain?: string;
        contactEmail?: string;
      };
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.organizationsService.update(organizationId, body, user.id);
  }

  @Get()
  @RequirePermissions('users:manage')
  findAll() {
    return this.organizationsService.findAll();
  }

  @Post(':organizationId/branding/:type(logo|banner)/upload-url')
  @RequirePermissions('users:manage')
  createBrandingUpload(
    @Param('organizationId') organizationId: string,
    @Param('type') type: 'logo' | 'banner',
    @Body() body: { filename: string; contentType?: string }
  ) {
    if (!body.filename) throw new Error('filename is required');
    return this.organizationsService.createBrandingUpload(organizationId, type, body.filename, body.contentType);
  }

  @Post(':organizationId/branding/:type(logo|banner)/confirm')
  @RequirePermissions('users:manage')
  confirmBrandingUpload(
    @Param('organizationId') organizationId: string,
    @Param('type') type: 'logo' | 'banner',
    @Body() body: { objectKey: string },
    @CurrentUser() user: AuthUser,
  ) {
    if (!body.objectKey) throw new Error('objectKey is required');
    return this.organizationsService.confirmBrandingUpload(organizationId, type, body.objectKey, user.id);
  }
}

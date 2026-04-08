import { Module } from '@nestjs/common';

import { OrganizationsMembershipsController } from './organizations-memberships.controller';
import { OrganizationsMembershipsService } from './organizations-memberships.service';

@Module({
  controllers: [OrganizationsMembershipsController],
  providers: [OrganizationsMembershipsService],
  exports: [OrganizationsMembershipsService],
})
export class OrganizationsMembershipsModule {}

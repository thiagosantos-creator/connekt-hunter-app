import { Module } from '@nestjs/common';

import { RbacTenancyController } from './rbac-tenancy.controller';
import { RbacTenancyService } from './rbac-tenancy.service';

@Module({
  controllers: [RbacTenancyController],
  providers: [RbacTenancyService],
  exports: [RbacTenancyService],
})
export class RbacTenancyModule {}

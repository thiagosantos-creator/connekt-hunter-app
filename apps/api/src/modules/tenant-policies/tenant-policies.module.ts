import { Module } from '@nestjs/common';
import { TenantPoliciesController } from './tenant-policies.controller.js';
import { TenantPoliciesService } from './tenant-policies.service.js';

@Module({
  controllers: [TenantPoliciesController],
  providers: [TenantPoliciesService],
})
export class TenantPoliciesModule {}

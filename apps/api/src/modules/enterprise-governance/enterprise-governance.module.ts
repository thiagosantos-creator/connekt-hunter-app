import { Module } from '@nestjs/common';
import { EnterpriseGovernanceController } from './enterprise-governance.controller.js';
import { EnterpriseGovernanceService } from './enterprise-governance.service.js';

@Module({
  controllers: [EnterpriseGovernanceController],
  providers: [EnterpriseGovernanceService],
})
export class EnterpriseGovernanceModule {}

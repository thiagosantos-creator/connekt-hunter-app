import { Module } from '@nestjs/common';
import { CandidateInsightsService } from './candidate-insights.service.js';
import { CandidateInsightsController } from './candidate-insights.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';

@Module({
  imports: [AuthModule, IntegrationsModule],
  controllers: [CandidateInsightsController],
  providers: [CandidateInsightsService],
  exports: [CandidateInsightsService],
})
export class CandidateInsightsModule {}

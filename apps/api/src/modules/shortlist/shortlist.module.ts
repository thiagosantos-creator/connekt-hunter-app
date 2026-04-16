import { Module } from '@nestjs/common';
import { ShortlistController } from './shortlist.controller.js';
import { ShortlistService } from './shortlist.service.js';
import { AuthModule } from '../auth/auth.module.js';

import { ApplicationsModule } from '../applications/applications.module.js';
import { CandidateInsightsModule } from '../candidate-insights/candidate-insights.module.js';

@Module({
  imports: [AuthModule, ApplicationsModule, CandidateInsightsModule],
  controllers: [ShortlistController],
  providers: [ShortlistService],
})
export class ShortlistModule {}

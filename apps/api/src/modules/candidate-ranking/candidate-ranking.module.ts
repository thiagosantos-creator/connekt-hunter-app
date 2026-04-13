import { Module } from '@nestjs/common';
import { CandidateRankingService } from './candidate-ranking.service.js';
import { CandidateRankingController } from './candidate-ranking.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';

@Module({
  imports: [AuthModule, IntegrationsModule],
  controllers: [CandidateRankingController],
  providers: [CandidateRankingService],
})
export class CandidateRankingModule {}

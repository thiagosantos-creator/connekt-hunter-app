import { Module } from '@nestjs/common';
import { CandidateMatchingService } from './candidate-matching.service.js';
import { CandidateMatchingController } from './candidate-matching.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';

@Module({
  imports: [AuthModule, IntegrationsModule],
  controllers: [CandidateMatchingController],
  providers: [CandidateMatchingService],
  exports: [CandidateMatchingService],
})
export class CandidateMatchingModule {}

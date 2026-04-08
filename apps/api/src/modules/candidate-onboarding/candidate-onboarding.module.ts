import { Module } from '@nestjs/common';

import { CandidateOnboardingController } from './candidate-onboarding.controller';
import { CandidateOnboardingService } from './candidate-onboarding.service';

@Module({
  controllers: [CandidateOnboardingController],
  providers: [CandidateOnboardingService],
  exports: [CandidateOnboardingService],
})
export class CandidateOnboardingModule {}

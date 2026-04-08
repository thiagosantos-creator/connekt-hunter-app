import { Controller, Get } from '@nestjs/common';

import { CandidateOnboardingService } from './candidate-onboarding.service';

@Controller('candidate-onboarding')
export class CandidateOnboardingController {
  constructor(private readonly service: CandidateOnboardingService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

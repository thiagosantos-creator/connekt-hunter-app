import { Body, Controller, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service.js';

@Controller('candidate/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('basic')
  basic(@Body() body: { token: string; fullName: string; phone: string }) {
    return this.onboardingService.basic(body.token, body.fullName, body.phone);
  }

  @Post('consent')
  consent(@Body() body: { token: string }) {
    return this.onboardingService.consent(body.token);
  }

  @Post('resume')
  resume(@Body() body: { token: string; filename: string }) {
    return this.onboardingService.resume(body.token, body.filename);
  }
}

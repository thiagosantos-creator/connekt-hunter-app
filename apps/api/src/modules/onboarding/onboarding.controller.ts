import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PublicTokenGuard } from '../auth/public-token.guard.js';
import { RateLimit } from '../auth/rate-limit.decorator.js';
import { OnboardingService } from './onboarding.service.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';

@Controller('candidate/onboarding')
@UseGuards(RateLimitGuard, PublicTokenGuard)
@RateLimit({ scope: 'candidate-onboarding', windowSec: 60, maxRequests: 20 })
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

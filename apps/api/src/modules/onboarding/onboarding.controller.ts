import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { PublicTokenGuard } from '../auth/public-token.guard.js';
import { RateLimit } from '../auth/rate-limit.decorator.js';
import { OnboardingService } from './onboarding.service.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';

@Controller('candidate/onboarding')
@UseGuards(RateLimitGuard, PublicTokenGuard)
@RateLimit({ scope: 'candidate-onboarding', windowSec: 60, maxRequests: 20 })
export class OnboardingController {
  constructor(@Inject(OnboardingService) private readonly onboardingService: OnboardingService) {}

  @Post('basic')
  basic(@Body() body: { token: string; fullName: string; phone: string }) {
    return this.onboardingService.basic(body.token, body.fullName, body.phone);
  }

  @Post('consent')
  consent(@Body() body: { token: string }) {
    return this.onboardingService.consent(body.token);
  }

  @Post('resume')
  resume(@Body() body: { token: string; filename: string; contentType?: string }) {
    return this.onboardingService.createResumeUpload(body.token, body.filename, body.contentType);
  }

  @Post('resume/complete')
  completeResume(@Body() body: { token: string; resumeId: string; filename: string }) {
    return this.onboardingService.completeResume(body.token, body.resumeId, body.filename);
  }

  @Get('parsed-resume/:token')
  parsedResume(@Param('token') token: string) {
    return this.onboardingService.getParsedResume(token);
  }

  @Get('status/:token')
  status(@Param('token') token: string) {
    return this.onboardingService.getStatus(token);
  }
}

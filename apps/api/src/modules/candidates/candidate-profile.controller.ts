import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { CandidateProfileService } from './candidate-profile.service.js';
import { PublicTokenGuard } from '../auth/public-token.guard.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';
import { RateLimit } from '../auth/rate-limit.decorator.js';

@Controller('candidate/profile')
@UseGuards(RateLimitGuard, PublicTokenGuard)
@RateLimit({ scope: 'candidate-profile', windowSec: 60, maxRequests: 15 })
export class CandidateProfileController {
  constructor(
    @Inject(CandidateProfileService) private readonly profileService: CandidateProfileService,
  ) {}

  /** POST /candidate/profile/photo — request presigned S3 upload URL */
  @Post('photo')
  createPhotoUpload(
    @Body() body: { token: string; filename: string; contentType?: string },
  ) {
    return this.profileService.createPhotoUpload(body.token, body.filename, body.contentType);
  }

  /** POST /candidate/profile/photo/confirm — confirm upload and persist photoUrl */
  @Post('photo/confirm')
  confirmPhotoUpload(
    @Body() body: { token: string; objectKey: string },
  ) {
    return this.profileService.confirmPhotoUpload(body.token, body.objectKey);
  }

  /** POST /candidate/profile/photo-url — get current photo URL */
  @Post('photo-url')
  getPhotoUrl(@Body() body: { token: string }) {
    return this.profileService.getPhotoUrl(body.token);
  }
}

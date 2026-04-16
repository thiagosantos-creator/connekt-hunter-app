import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CandidateProfileService } from './candidate-profile.service.js';
import { PublicTokenGuard } from '../auth/public-token.guard.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';
import { RateLimit } from '../auth/rate-limit.decorator.js';

@Controller('candidate/profile')
@UseGuards(RateLimitGuard, PublicTokenGuard)
@RateLimit({ scope: 'candidate-profile', windowSec: 60, maxRequests: 30 })
export class CandidateProfileController {
  constructor(
    @Inject(CandidateProfileService) private readonly profileService: CandidateProfileService,
  ) {}

  /** GET /candidate/profile/:token — get full profile with structured data */
  @Get(':token')
  getFullProfile(@Param('token') token: string) {
    return this.profileService.getFullProfile(token);
  }

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

  // ── Experience endpoints ──────────────────────────────────────────────

  @Post('experience')
  addExperience(@Body() body: { token: string; company: string; role: string; period?: string; description?: string }) {
    return this.profileService.addExperience(body.token, { company: body.company, role: body.role, period: body.period, description: body.description });
  }

  @Patch('experience/:id')
  updateExperience(@Param('id') id: string, @Body() body: { token: string; company?: string; role?: string; period?: string; description?: string }) {
    return this.profileService.updateExperience(body.token, id, { company: body.company, role: body.role, period: body.period, description: body.description });
  }

  @Delete('experience/:id')
  deleteExperience(@Param('id') id: string, @Body() body: { token: string }) {
    return this.profileService.deleteExperience(body.token, id);
  }

  // ── Education endpoints ───────────────────────────────────────────────

  @Post('education')
  addEducation(@Body() body: { token: string; institution: string; degree: string; field?: string; period?: string }) {
    return this.profileService.addEducation(body.token, { institution: body.institution, degree: body.degree, field: body.field, period: body.period });
  }

  @Patch('education/:id')
  updateEducation(@Param('id') id: string, @Body() body: { token: string; institution?: string; degree?: string; field?: string; period?: string }) {
    return this.profileService.updateEducation(body.token, id, { institution: body.institution, degree: body.degree, field: body.field, period: body.period });
  }

  @Delete('education/:id')
  deleteEducation(@Param('id') id: string, @Body() body: { token: string }) {
    return this.profileService.deleteEducation(body.token, id);
  }

  // ── Skills endpoints ──────────────────────────────────────────────────

  @Post('skills')
  addSkill(@Body() body: { token: string; name: string; level?: string }) {
    return this.profileService.addSkill(body.token, { name: body.name, level: body.level });
  }

  @Delete('skills/:id')
  deleteSkill(@Param('id') id: string, @Body() body: { token: string }) {
    return this.profileService.deleteSkill(body.token, id);
  }

  // ── Languages endpoints ───────────────────────────────────────────────

  @Post('languages')
  addLanguage(@Body() body: { token: string; name: string; level?: string }) {
    return this.profileService.addLanguage(body.token, { name: body.name, level: body.level });
  }

  @Delete('languages/:id')
  deleteLanguage(@Param('id') id: string, @Body() body: { token: string }) {
    return this.profileService.deleteLanguage(body.token, id);
  }
}

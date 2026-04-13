import { Body, Controller, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { SmartInterviewService } from './smart-interview.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';
import { PublicTokenGuard } from '../auth/public-token.guard.js';
import { RateLimit } from '../auth/rate-limit.decorator.js';

@Controller('smart-interview')
export class SmartInterviewController {
  constructor(@Inject(SmartInterviewService) private readonly smartInterviewService: SmartInterviewService) {}

  @Post('templates')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('smart-interview:configure')
  upsertTemplate(@Body() body: { vacancyId: string; configJson: Record<string, unknown> }, @CurrentUser() user: AuthUser) {
    return this.smartInterviewService.upsertTemplate({ ...body, createdBy: user.id });
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('smart-interview:configure')
  byVacancy(@Query('vacancyId') vacancyId: string) {
    return this.smartInterviewService.findTemplateByVacancy(vacancyId);
  }

  @Post('templates/:templateId/generate-questions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('smart-interview:configure')
  generate(@Param('templateId') templateId: string) {
    return this.smartInterviewService.generateQuestions(templateId);
  }

  @Put('templates/:templateId/questions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('smart-interview:configure')
  replaceQuestions(@Param('templateId') templateId: string, @Body() body: { questions: Array<{ orderIndex: number; prompt: string; maxDuration?: number }> }) {
    return this.smartInterviewService.replaceQuestions(templateId, body.questions);
  }

  @Post('sessions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('smart-interview:configure')
  createSession(@Body() body: { applicationId: string }) {
    return this.smartInterviewService.createSession(body);
  }

  @Get('sessions/:sessionId/review')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('smart-interview:review')
  review(@Param('sessionId') sessionId: string) {
    return this.smartInterviewService.getReviewSession(sessionId);
  }

  @Post('sessions/:sessionId/human-review')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('smart-interview:review')
  humanReview(@Param('sessionId') sessionId: string, @Body() body: { decision: string; notes: string }, @CurrentUser() user: AuthUser) {
    return this.smartInterviewService.submitHumanReview({ sessionId, reviewerId: user.id, decision: body.decision, notes: body.notes });
  }

  @Get('candidate/session/:publicToken')
  @UseGuards(RateLimitGuard, PublicTokenGuard)
  @RateLimit({ scope: 'smart-interview-session', windowSec: 60, maxRequests: 30 })
  candidateSession(@Param('publicToken') publicToken: string) {
    return this.smartInterviewService.getCandidateSession(publicToken);
  }

  @Post('sessions/:sessionId/answers/presign')
  @UseGuards(RateLimitGuard)
  @RateLimit({ scope: 'smart-interview-presign', windowSec: 60, maxRequests: 30 })
  createUpload(@Param('sessionId') sessionId: string, @Body() body: { questionId: string }) {
    return this.smartInterviewService.createPresignedUpload({ sessionId, questionId: body.questionId });
  }

  @Post('sessions/:sessionId/answers/complete')
  @UseGuards(RateLimitGuard)
  @RateLimit({ scope: 'smart-interview-complete', windowSec: 60, maxRequests: 30 })
  completeAnswer(@Param('sessionId') sessionId: string, @Body() body: { questionId: string; objectKey: string; durationSec?: number }) {
    return this.smartInterviewService.completeAnswer({ sessionId, ...body });
  }

  @Post('sessions/:sessionId/submit')
  @UseGuards(RateLimitGuard)
  @RateLimit({ scope: 'smart-interview-submit', windowSec: 60, maxRequests: 20 })
  submitSession(@Param('sessionId') sessionId: string) {
    return this.smartInterviewService.submitSession(sessionId);
  }
}

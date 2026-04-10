import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { SmartInterviewService } from './smart-interview.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/rbac/permissions.guard.js';
import { RequirePermissions } from '../auth/rbac/permissions.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';

@Controller('smart-interview')
export class SmartInterviewController {
  constructor(private readonly smartInterviewService: SmartInterviewService) {}

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
  createSession(@Body() body: { applicationId: string }, @CurrentUser() user: AuthUser) {
    return this.smartInterviewService.createSession({ ...body, createdBy: user.id });
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
  candidateSession(@Param('publicToken') publicToken: string) {
    return this.smartInterviewService.getCandidateSession(publicToken);
  }

  @Post('sessions/:sessionId/answers/presign')
  createUpload(@Param('sessionId') sessionId: string, @Body() body: { questionId: string; publicToken: string }) {
    return this.smartInterviewService.createPresignedUpload({ sessionId, questionId: body.questionId, publicToken: body.publicToken });
  }

  @Post('sessions/:sessionId/answers/complete')
  completeAnswer(@Param('sessionId') sessionId: string, @Body() body: { questionId: string; objectKey: string; durationSec?: number; publicToken: string }) {
    return this.smartInterviewService.completeAnswer({ sessionId, ...body });
  }

  @Post('sessions/:sessionId/submit')
  submitSession(@Param('sessionId') sessionId: string, @Body() body: { publicToken: string }) {
    return this.smartInterviewService.submitSession({ sessionId, publicToken: body.publicToken });
  }
}

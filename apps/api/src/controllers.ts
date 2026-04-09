import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './service.js';

@Controller()
export class AppController {
  constructor(private readonly service: AppService) {}

  @Get('/health')
  health() { return this.service.health(); }

  @Post('/auth/dev-login')
  login(@Body() body: { email: string }) { return this.service.login(body.email); }

  @Post('/vacancies')
  createVacancy(@Body() body: { organizationId: string; title: string; description: string; createdBy: string; }) { return this.service.createVacancy(body); }

  @Post('/candidates/invite')
  invite(@Body() body: { organizationId: string; email: string; vacancyId: string; }) { return this.service.inviteCandidate(body.organizationId, body.email, body.vacancyId); }

  @Get('/candidate/token/:token')
  byToken(@Param('token') token: string) { return this.service.byToken(token); }

  @Post('/candidate/onboarding/basic')
  basic(@Body() body: { token: string; fullName: string; phone: string; }) { return this.service.onboardingBasic(body.token, body.fullName, body.phone); }

  @Post('/candidate/onboarding/consent')
  consent(@Body() body: { token: string }) { return this.service.onboardingConsent(body.token); }

  @Post('/candidate/onboarding/resume')
  resume(@Body() body: { token: string; filename: string }) { return this.service.onboardingResume(body.token, body.filename); }

  @Get('/applications')
  applications() { return this.service.listApplications(); }

  @Post('/shortlist')
  shortlist(@Body() body: { applicationId: string }) { return this.service.shortlist(body.applicationId); }

  @Post('/evaluations')
  evaluate(@Body() body: { applicationId: string; evaluatorId: string; comment: string }) { return this.service.evaluate(body.applicationId, body.evaluatorId, body.comment); }

  @Post('/client-decisions')
  decision(@Body() body: { shortlistItemId: string; reviewerId: string; decision: string }) { return this.service.clientDecision(body.shortlistItemId, body.reviewerId, body.decision); }
}

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CandidatesService } from './candidates.service.js';

@Controller()
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post('candidates/invite')
  invite(@Body() body: { organizationId: string; email: string; vacancyId: string }) {
    return this.candidatesService.invite(body.organizationId, body.email, body.vacancyId);
  }

  @Get('candidate/token/:token')
  byToken(@Param('token') token: string) {
    return this.candidatesService.byToken(token);
  }
}

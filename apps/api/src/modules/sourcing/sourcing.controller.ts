import { Controller, Get, Post, Body, Query, UseGuards, Req, Req as Request } from '@nestjs/common';
import { SourcingService } from './sourcing.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('sourcing')
@UseGuards(JwtAuthGuard)
export class SourcingController {
  constructor(private readonly sourcingService: SourcingService) {}

  @Get('search')
  async search(
    @Query('query') query: string,
    @Req() req: any
  ) {
    return this.sourcingService.searchCandidates(query || '', req.user.organizationId);
  }

  @Get('conflicts')
  async getConflicts(
    @Query('candidateId') candidateId: string,
    @Req() req: any
  ) {
    return this.sourcingService.checkShortlistConflicts(candidateId, req.user.organizationId);
  }

  @Post('fit-insight')
  async getFitInsight(
    @Body() body: { candidateId: string; vacancyId: string },
    @Req() req: any
  ) {
    return this.sourcingService.getFitInsight(body.candidateId, body.vacancyId, req.user.id);
  }

  @Post('invite')
  async invite(
    @Body() body: { candidateId: string; vacancyId: string; channel: 'email' | 'phone' },
    @Req() req: any
  ) {
    return this.sourcingService.inviteToVacancy({
      ...body,
      organizationId: req.user.organizationId,
      actorUserId: req.user.id
    });
  }
}

import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { VacanciesService } from './vacancies.service.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';
import { RateLimit } from '../auth/rate-limit.decorator.js';

@Controller('public/vacancies')
@UseGuards(RateLimitGuard)
export class PublicVacanciesController {
  constructor(@Inject(VacanciesService) private readonly vacanciesService: VacanciesService) {}

  @Get(':vacancyId')
  @RateLimit({ scope: 'public-vacancy', windowSec: 60, maxRequests: 60 })
  findOne(@Param('vacancyId') vacancyId: string) {
    return this.vacanciesService.findPublicById(vacancyId);
  }

  @Post(':vacancyId/apply')
  @RateLimit({ scope: 'public-vacancy-apply', windowSec: 60, maxRequests: 10 })
  apply(
    @Param('vacancyId') vacancyId: string,
    @Body() body: { email: string; fullName: string; phone?: string },
  ) {
    return this.vacanciesService.publicApply(vacancyId, body.email, body.fullName, body.phone);
  }
}

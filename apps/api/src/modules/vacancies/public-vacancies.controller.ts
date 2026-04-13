import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
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
}

import { Body, Controller, Get, Post } from '@nestjs/common';
import { VacanciesService } from './vacancies.service.js';

@Controller('vacancies')
export class VacanciesController {
  constructor(private readonly vacanciesService: VacanciesService) {}

  @Post()
  create(@Body() body: { organizationId: string; title: string; description: string; createdBy: string }) {
    return this.vacanciesService.create(body);
  }

  @Get()
  findAll() {
    return this.vacanciesService.findAll();
  }
}

import { Module } from '@nestjs/common';
import { VacanciesController } from './vacancies.controller.js';
import { VacanciesService } from './vacancies.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PublicVacanciesController } from './public-vacancies.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [VacanciesController, PublicVacanciesController],
  providers: [VacanciesService],
})
export class VacanciesModule {}

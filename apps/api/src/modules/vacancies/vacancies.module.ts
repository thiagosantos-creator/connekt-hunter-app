import { Module } from '@nestjs/common';
import { VacanciesController } from './vacancies.controller.js';
import { VacanciesService } from './vacancies.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [VacanciesController],
  providers: [VacanciesService],
})
export class VacanciesModule {}

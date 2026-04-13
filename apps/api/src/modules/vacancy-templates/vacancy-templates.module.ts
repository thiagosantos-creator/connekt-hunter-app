import { Module } from '@nestjs/common';
import { VacancyTemplatesController } from './vacancy-templates.controller.js';
import { VacancyTemplatesService } from './vacancy-templates.service.js';

@Module({
  controllers: [VacancyTemplatesController],
  providers: [VacancyTemplatesService],
})
export class VacancyTemplatesModule {}

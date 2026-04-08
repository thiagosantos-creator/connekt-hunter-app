import { Module } from '@nestjs/common';

import { VacancyPublishingController } from './vacancy-publishing.controller';
import { VacancyPublishingService } from './vacancy-publishing.service';

@Module({
  controllers: [VacancyPublishingController],
  providers: [VacancyPublishingService],
  exports: [VacancyPublishingService],
})
export class VacancyPublishingModule {}

import { Module } from '@nestjs/common';

import { ResumeProcessingController } from './resume-processing.controller';
import { ResumeProcessingService } from './resume-processing.service';

@Module({
  controllers: [ResumeProcessingController],
  providers: [ResumeProcessingService],
  exports: [ResumeProcessingService],
})
export class ResumeProcessingModule {}

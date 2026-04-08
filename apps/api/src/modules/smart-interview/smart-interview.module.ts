import { Module } from '@nestjs/common';

import { SmartInterviewController } from './smart-interview.controller';
import { SmartInterviewService } from './smart-interview.service';

@Module({
  controllers: [SmartInterviewController],
  providers: [SmartInterviewService],
  exports: [SmartInterviewService],
})
export class SmartInterviewModule {}

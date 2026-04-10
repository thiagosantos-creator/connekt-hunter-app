import { Module } from '@nestjs/common';
import { SmartInterviewController } from './smart-interview.controller.js';
import { SmartInterviewService } from './smart-interview.service.js';

@Module({
  controllers: [SmartInterviewController],
  providers: [SmartInterviewService],
})
export class SmartInterviewModule {}

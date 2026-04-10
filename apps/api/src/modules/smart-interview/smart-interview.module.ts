import { Module } from '@nestjs/common';
import { SmartInterviewController } from './smart-interview.controller.js';
import { SmartInterviewService } from './smart-interview.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [SmartInterviewController],
  providers: [SmartInterviewService],
})
export class SmartInterviewModule {}

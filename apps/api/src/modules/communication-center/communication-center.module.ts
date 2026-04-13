import { Module } from '@nestjs/common';
import { CommunicationCenterController } from './communication-center.controller.js';
import { CommunicationCenterService } from './communication-center.service.js';

@Module({
  controllers: [CommunicationCenterController],
  providers: [CommunicationCenterService],
})
export class CommunicationCenterModule {}

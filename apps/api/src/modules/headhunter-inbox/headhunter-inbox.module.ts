import { Module } from '@nestjs/common';
import { HeadhunterInboxController } from './headhunter-inbox.controller.js';
import { HeadhunterInboxService } from './headhunter-inbox.service.js';

@Module({
  controllers: [HeadhunterInboxController],
  providers: [HeadhunterInboxService],
})
export class HeadhunterInboxModule {}

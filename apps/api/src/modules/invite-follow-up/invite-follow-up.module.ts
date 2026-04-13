import { Module } from '@nestjs/common';
import { InviteFollowUpController } from './invite-follow-up.controller.js';
import { InviteFollowUpService } from './invite-follow-up.service.js';

@Module({
  controllers: [InviteFollowUpController],
  providers: [InviteFollowUpService],
  exports: [InviteFollowUpService],
})
export class InviteFollowUpModule {}

import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller.js';
import { CandidatesService } from './candidates.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { InviteFollowUpModule } from '../invite-follow-up/invite-follow-up.module.js';

@Module({
  imports: [AuthModule, InviteFollowUpModule],
  controllers: [CandidatesController],
  providers: [CandidatesService],
})
export class CandidatesModule {}

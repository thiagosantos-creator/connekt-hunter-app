import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller.js';
import { CandidatesService } from './candidates.service.js';
import { CandidateProfileService } from './candidate-profile.service.js';
import { CandidateProfileController } from './candidate-profile.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { InviteFollowUpModule } from '../invite-follow-up/invite-follow-up.module.js';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';

@Module({
  imports: [AuthModule, InviteFollowUpModule, NotificationPreferencesModule, IntegrationsModule],
  controllers: [CandidatesController, CandidateProfileController],
  providers: [CandidatesService, CandidateProfileService],
  exports: [CandidatesService, CandidateProfileService],
})
export class CandidatesModule {}


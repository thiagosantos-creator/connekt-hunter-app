import { Module } from '@nestjs/common';
import { UserManagementController } from './user-management.controller.js';
import { UserManagementService } from './user-management.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';

@Module({
  imports: [AuthModule, NotificationPreferencesModule, IntegrationsModule],
  controllers: [UserManagementController],
  providers: [UserManagementService],
})
export class UserManagementModule {}

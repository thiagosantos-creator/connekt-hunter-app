import { Module } from '@nestjs/common';
import { NotificationPreferencesController } from './notification-preferences.controller.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { NotificationDispatchService } from './notification-dispatch.service.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';

@Module({
  imports: [IntegrationsModule],
  controllers: [NotificationPreferencesController],
  providers: [NotificationPreferencesService, NotificationDispatchService],
  exports: [NotificationPreferencesService, NotificationDispatchService],
})
export class NotificationPreferencesModule {}

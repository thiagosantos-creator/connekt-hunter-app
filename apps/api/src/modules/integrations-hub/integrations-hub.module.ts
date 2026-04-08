import { Module } from '@nestjs/common';

import { IntegrationsHubController } from './integrations-hub.controller';
import { IntegrationsHubService } from './integrations-hub.service';

@Module({
  controllers: [IntegrationsHubController],
  providers: [IntegrationsHubService],
  exports: [IntegrationsHubService],
})
export class IntegrationsHubModule {}

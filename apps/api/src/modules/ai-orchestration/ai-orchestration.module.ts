import { Module } from '@nestjs/common';

import { AiOrchestrationController } from './ai-orchestration.controller';
import { AiOrchestrationService } from './ai-orchestration.service';

@Module({
  controllers: [AiOrchestrationController],
  providers: [AiOrchestrationService],
  exports: [AiOrchestrationService],
})
export class AiOrchestrationModule {}

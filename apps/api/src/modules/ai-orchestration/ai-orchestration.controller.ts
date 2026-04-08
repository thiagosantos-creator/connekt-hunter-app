import { Controller, Get } from '@nestjs/common';

import { AiOrchestrationService } from './ai-orchestration.service';

@Controller('ai-orchestration')
export class AiOrchestrationController {
  constructor(private readonly service: AiOrchestrationService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

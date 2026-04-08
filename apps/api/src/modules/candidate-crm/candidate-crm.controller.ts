import { Controller, Get } from '@nestjs/common';

import { CandidateCrmService } from './candidate-crm.service';

@Controller('candidate-crm')
export class CandidateCrmController {
  constructor(private readonly service: CandidateCrmService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

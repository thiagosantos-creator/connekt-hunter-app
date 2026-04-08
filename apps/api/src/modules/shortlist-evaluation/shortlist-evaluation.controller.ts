import { Controller, Get } from '@nestjs/common';

import { ShortlistEvaluationService } from './shortlist-evaluation.service';

@Controller('shortlist-evaluation')
export class ShortlistEvaluationController {
  constructor(private readonly service: ShortlistEvaluationService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

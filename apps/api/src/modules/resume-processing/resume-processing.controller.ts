import { Controller, Get } from '@nestjs/common';

import { ResumeProcessingService } from './resume-processing.service';

@Controller('resume-processing')
export class ResumeProcessingController {
  constructor(private readonly service: ResumeProcessingService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

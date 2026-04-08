import { Controller, Get } from '@nestjs/common';

import { SmartInterviewService } from './smart-interview.service';

@Controller('smart-interview')
export class SmartInterviewController {
  constructor(private readonly service: SmartInterviewService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

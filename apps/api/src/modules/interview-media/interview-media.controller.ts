import { Controller, Get } from '@nestjs/common';

import { InterviewMediaService } from './interview-media.service';

@Controller('interview-media')
export class InterviewMediaController {
  constructor(private readonly service: InterviewMediaService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

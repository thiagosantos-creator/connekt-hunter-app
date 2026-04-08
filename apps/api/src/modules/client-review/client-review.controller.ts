import { Controller, Get } from '@nestjs/common';

import { ClientReviewService } from './client-review.service';

@Controller('client-review')
export class ClientReviewController {
  constructor(private readonly service: ClientReviewService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

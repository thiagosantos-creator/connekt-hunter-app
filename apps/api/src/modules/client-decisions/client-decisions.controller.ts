import { Body, Controller, Post } from '@nestjs/common';
import { ClientDecisionsService } from './client-decisions.service.js';

@Controller('client-decisions')
export class ClientDecisionsController {
  constructor(private readonly clientDecisionsService: ClientDecisionsService) {}

  @Post()
  create(@Body() body: { shortlistItemId: string; reviewerId: string; decision: string }) {
    return this.clientDecisionsService.create(body.shortlistItemId, body.reviewerId, body.decision);
  }
}

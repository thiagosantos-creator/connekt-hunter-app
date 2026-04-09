import { Body, Controller, Post } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service.js';

@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post()
  create(@Body() body: { applicationId: string; evaluatorId: string; comment: string }) {
    return this.evaluationsService.create(body.applicationId, body.evaluatorId, body.comment);
  }
}

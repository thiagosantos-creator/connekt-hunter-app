import { Body, Controller, Post } from '@nestjs/common';
import { ShortlistService } from './shortlist.service.js';

@Controller('shortlist')
export class ShortlistController {
  constructor(private readonly shortlistService: ShortlistService) {}

  @Post()
  add(@Body() body: { applicationId: string }) {
    return this.shortlistService.addToShortlist(body.applicationId);
  }
}

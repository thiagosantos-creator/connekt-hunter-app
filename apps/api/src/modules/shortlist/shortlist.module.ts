import { Module } from '@nestjs/common';
import { ShortlistController } from './shortlist.controller.js';
import { ShortlistService } from './shortlist.service.js';

@Module({
  controllers: [ShortlistController],
  providers: [ShortlistService],
})
export class ShortlistModule {}

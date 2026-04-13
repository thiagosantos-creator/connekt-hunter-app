import { Module } from '@nestjs/common';
import { ShortlistController } from './shortlist.controller.js';
import { ShortlistService } from './shortlist.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ShortlistController],
  providers: [ShortlistService],
})
export class ShortlistModule {}

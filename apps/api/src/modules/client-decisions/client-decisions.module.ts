import { Module } from '@nestjs/common';
import { ClientDecisionsController } from './client-decisions.controller.js';
import { ClientDecisionsService } from './client-decisions.service.js';

@Module({
  controllers: [ClientDecisionsController],
  providers: [ClientDecisionsService],
})
export class ClientDecisionsModule {}

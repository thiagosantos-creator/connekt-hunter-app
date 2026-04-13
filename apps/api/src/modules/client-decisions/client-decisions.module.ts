import { Module } from '@nestjs/common';
import { ClientDecisionsController } from './client-decisions.controller.js';
import { ClientDecisionsService } from './client-decisions.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ClientDecisionsController],
  providers: [ClientDecisionsService],
})
export class ClientDecisionsModule {}

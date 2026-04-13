import { Module } from '@nestjs/common';
import { EvaluationsController } from './evaluations.controller.js';
import { EvaluationsService } from './evaluations.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
})
export class EvaluationsModule {}

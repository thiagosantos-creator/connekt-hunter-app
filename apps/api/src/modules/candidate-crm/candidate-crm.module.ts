import { Module } from '@nestjs/common';

import { CandidateCrmController } from './candidate-crm.controller';
import { CandidateCrmService } from './candidate-crm.service';

@Module({
  controllers: [CandidateCrmController],
  providers: [CandidateCrmService],
  exports: [CandidateCrmService],
})
export class CandidateCrmModule {}

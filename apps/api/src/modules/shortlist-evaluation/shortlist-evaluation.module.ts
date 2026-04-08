import { Module } from '@nestjs/common';

import { ShortlistEvaluationController } from './shortlist-evaluation.controller';
import { ShortlistEvaluationService } from './shortlist-evaluation.service';

@Module({
  controllers: [ShortlistEvaluationController],
  providers: [ShortlistEvaluationService],
  exports: [ShortlistEvaluationService],
})
export class ShortlistEvaluationModule {}

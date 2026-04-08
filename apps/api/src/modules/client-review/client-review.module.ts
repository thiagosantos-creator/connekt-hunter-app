import { Module } from '@nestjs/common';

import { ClientReviewController } from './client-review.controller';
import { ClientReviewService } from './client-review.service';

@Module({
  controllers: [ClientReviewController],
  providers: [ClientReviewService],
  exports: [ClientReviewService],
})
export class ClientReviewModule {}

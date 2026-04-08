import { Module } from '@nestjs/common';

import { InterviewMediaController } from './interview-media.controller';
import { InterviewMediaService } from './interview-media.service';

@Module({
  controllers: [InterviewMediaController],
  providers: [InterviewMediaService],
  exports: [InterviewMediaService],
})
export class InterviewMediaModule {}

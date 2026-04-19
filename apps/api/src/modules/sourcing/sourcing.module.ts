import { Module } from '@nestjs/common';
import { SourcingService } from './sourcing.service.js';
import { SourcingController } from './sourcing.controller.js';
import { CandidatesModule } from '../candidates/candidates.module.js';
import { CandidateMatchingModule } from '../candidate-matching/candidate-matching.module.js';

@Module({
  imports: [CandidatesModule, CandidateMatchingModule],
  providers: [SourcingService],
  controllers: [SourcingController],
  exports: [SourcingService],
})
export class SourcingModule {}

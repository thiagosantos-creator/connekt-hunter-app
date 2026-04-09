import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class EvaluationsService {
  create(applicationId: string, evaluatorId: string, comment: string) {
    return prisma.evaluation.create({ data: { applicationId, evaluatorId, comment } });
  }
}

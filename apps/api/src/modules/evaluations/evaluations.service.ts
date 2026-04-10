import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class EvaluationsService {
  async create(applicationId: string, evaluatorId: string, comment: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { vacancy: true },
    });
    if (!application) throw new NotFoundException('application_not_found');

    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: application.vacancy.organizationId, userId: evaluatorId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    const evaluation = await prisma.evaluation.create({ data: { applicationId, evaluatorId, comment } });

    await prisma.auditEvent.create({
      data: {
        actorId: evaluatorId,
        action: 'evaluation.created',
        entityType: 'Application',
        entityId: applicationId,
        metadata: { evaluationId: evaluation.id } as never,
      },
    });

    return evaluation;
  }
}

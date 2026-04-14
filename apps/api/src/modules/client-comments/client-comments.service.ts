import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class ClientCommentsService {
  async create(input: {
    applicationId: string;
    comment: string;
    reviewerId: string;
  }) {
    const application = await prisma.application.findUnique({
      where: { id: input.applicationId },
      include: { vacancy: true },
    });
    if (!application) throw new NotFoundException('application_not_found');

    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: application.vacancy.organizationId,
          userId: input.reviewerId,
        },
      },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    let sanitized = input.comment;
    // Iteratively strip HTML/script tags to prevent injection
    let prev = '';
    while (prev !== sanitized) {
      prev = sanitized;
      sanitized = sanitized.replace(/<\/?[a-zA-Z][^>]*>/g, '');
    }
    sanitized = sanitized.trim();
    if (!sanitized) throw new ForbiddenException('empty_comment');

    const evaluation = await prisma.evaluation.create({
      data: {
        applicationId: input.applicationId,
        evaluatorId: input.reviewerId,
        comment: `[Cliente] ${sanitized}`,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: input.reviewerId,
        action: 'client.comment',
        entityType: 'Application',
        entityId: input.applicationId,
        metadata: {
          evaluationId: evaluation.id,
          vacancyId: application.vacancyId,
          candidateId: application.candidateId,
        } as never,
      },
    });

    return evaluation;
  }

  async findByApplication(applicationId: string, organizationIds: string[], role: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { vacancy: true },
    });
    if (!application) throw new NotFoundException('application_not_found');
    if (role !== 'admin' && !organizationIds.includes(application.vacancy.organizationId)) {
      throw new ForbiddenException('user_not_member_of_org');
    }

    return prisma.evaluation.findMany({
      where: {
        applicationId,
        comment: { startsWith: '[Cliente]' },
      },
      include: {
        evaluator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

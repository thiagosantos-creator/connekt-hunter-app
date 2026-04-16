import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';

interface RatingInput {
  ratingTechnical?: number;
  ratingBehavioral?: number;
  ratingInterviewer?: number;
  ratingAi?: number;
}

function computeOverall(ratings: RatingInput): number | undefined {
  const values = [
    ratings.ratingTechnical,
    ratings.ratingBehavioral,
    ratings.ratingInterviewer,
    ratings.ratingAi,
  ].filter((v): v is number => typeof v === 'number' && v >= 1 && v <= 5);

  if (values.length === 0) return undefined;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  // Convert 1-5 avg to 0-100 score
  return Math.round(((avg - 1) / 4) * 100);
}

@Injectable()
export class EvaluationsService {
  async create(
    applicationId: string,
    evaluatorId: string,
    comment: string,
    ratings: RatingInput = {},
  ) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { vacancy: true },
    });
    if (!application) throw new NotFoundException('application_not_found');

    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: application.vacancy.organizationId, userId: evaluatorId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    const overallRating = computeOverall(ratings);

    const evaluation = await prisma.evaluation.create({
      data: {
        applicationId,
        evaluatorId,
        comment,
        ratingTechnical: ratings.ratingTechnical,
        ratingBehavioral: ratings.ratingBehavioral,
        ratingInterviewer: ratings.ratingInterviewer,
        ratingAi: ratings.ratingAi,
        overallRating,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: evaluatorId,
        action: 'evaluation.created',
        entityType: 'Application',
        entityId: applicationId,
        metadata: { evaluationId: evaluation.id, overallRating } as never,
      },
    });

    return evaluation;
  }

  async findByApplication(applicationId: string, actorId: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { vacancy: true },
    });
    if (!application) throw new NotFoundException('application_not_found');

    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: application.vacancy.organizationId, userId: actorId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    return prisma.evaluation.findMany({
      where: { applicationId },
      include: { evaluator: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    evaluationId: string,
    actorId: string,
    comment: string,
    ratings: RatingInput = {},
  ) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { application: { include: { vacancy: true } } },
    });
    if (!evaluation) throw new NotFoundException('evaluation_not_found');

    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: evaluation.application.vacancy.organizationId, userId: actorId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    const overallRating = computeOverall(ratings);

    const updated = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        comment,
        ratingTechnical: ratings.ratingTechnical,
        ratingBehavioral: ratings.ratingBehavioral,
        ratingInterviewer: ratings.ratingInterviewer,
        ratingAi: ratings.ratingAi,
        overallRating,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'evaluation.updated',
        entityType: 'Evaluation',
        entityId: evaluationId,
        metadata: { applicationId: evaluation.applicationId, overallRating } as never,
      },
    });

    return updated;
  }
}

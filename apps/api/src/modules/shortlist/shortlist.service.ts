import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class ShortlistService {
  async addToShortlist(applicationId: string, actorId?: string) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { vacancy: true },
    });
    if (!app) throw new NotFoundException('application_not_found');

    if (actorId) {
      const membership = await prisma.membership.findUnique({
        where: { organizationId_userId: { organizationId: app.vacancy.organizationId, userId: actorId } },
      });
      if (!membership) throw new ForbiddenException('user_not_member_of_org');
    }

    const shortlist = await prisma.shortlist.upsert({
      where: { vacancyId: app.vacancyId },
      update: {},
      create: { vacancyId: app.vacancyId },
    });
    const item = await prisma.shortlistItem.upsert({
      where: { shortlistId_applicationId: { shortlistId: shortlist.id, applicationId } },
      update: {},
      create: { shortlistId: shortlist.id, applicationId },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'shortlist.added',
        entityType: 'Application',
        entityId: applicationId,
        metadata: { vacancyId: app.vacancyId, shortlistId: shortlist.id } as never,
      },
    });

    return item;
  }
}

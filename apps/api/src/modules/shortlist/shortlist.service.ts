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

  async removeFromShortlist(itemId: string, actorId?: string) {
    const item = await prisma.shortlistItem.findUnique({
      where: { id: itemId },
      include: { shortlist: { include: { vacancy: true } } },
    });
    if (!item) throw new NotFoundException('shortlist_item_not_found');

    if (actorId) {
      const membership = await prisma.membership.findUnique({
        where: { organizationId_userId: { organizationId: item.shortlist.vacancy.organizationId, userId: actorId } },
      });
      if (!membership) throw new ForbiddenException('user_not_member_of_org');
    }

    await prisma.shortlistItem.delete({ where: { id: itemId } });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'shortlist.removed',
        entityType: 'ShortlistItem',
        entityId: itemId,
        metadata: { applicationId: item.applicationId, vacancyId: item.shortlist.vacancyId } as never,
      },
    });

    return { success: true };
  }

  findShortlistedApplications(organizationIds: string[], role: string) {
    const where =
      role === 'admin'
        ? {}
        : { shortlist: { vacancy: { organizationId: { in: organizationIds } } } };
    return prisma.shortlistItem.findMany({
      where,
      include: {
        application: {
          include: { candidate: true, vacancy: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

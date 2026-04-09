import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class ShortlistService {
  async addToShortlist(applicationId: string) {
    const app = await prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { vacancy: true },
    });
    const shortlist = await prisma.shortlist.upsert({
      where: { vacancyId: app.vacancyId },
      update: {},
      create: { vacancyId: app.vacancyId },
    });
    return prisma.shortlistItem.upsert({
      where: { shortlistId_applicationId: { shortlistId: shortlist.id, applicationId } },
      update: {},
      create: { shortlistId: shortlist.id, applicationId },
    });
  }
}

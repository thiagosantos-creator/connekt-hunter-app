import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class ApplicationsService {
  findAll(organizationIds: string[]) {
    return prisma.application.findMany({
      where: { vacancy: { organizationId: { in: organizationIds } } },
      include: {
        candidate: true,
        vacancy: true,
      },
    });
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class VacanciesService {
  async create(data: { organizationId: string; title: string; description: string; createdBy: string }) {
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: data.organizationId, userId: data.createdBy } },
    });

    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    return prisma.vacancy.create({ data });
  }

  findAll(organizationIds: string[], role: string) {
    if (role === 'admin') {
      return prisma.vacancy.findMany({ include: { organization: true } });
    }
    return prisma.vacancy.findMany({
      where: { organizationId: { in: organizationIds } },
      include: { organization: true },
    });
  }
}

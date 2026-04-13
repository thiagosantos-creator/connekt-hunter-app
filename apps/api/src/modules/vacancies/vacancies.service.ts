import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class VacanciesService {
  async create(data: {
    organizationId: string;
    title: string;
    description: string;
    location?: string;
    workModel?: string;
    seniority?: string;
    employmentType?: string;
    publicationType?: string;
    status?: string;
    department?: string;
    requiredSkills?: string[];
    desiredSkills?: string[];
    salaryMin?: number;
    salaryMax?: number;
    createdBy: string;
  }) {
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: data.organizationId, userId: data.createdBy } },
    });

    if (!membership) throw new ForbiddenException('user_not_member_of_org');
    return prisma.vacancy.create({
      data: {
        ...data,
        publicationType: data.publicationType ?? 'draft',
        status: data.status ?? 'active',
        requiredSkills: data.requiredSkills ?? [],
        desiredSkills: data.desiredSkills ?? [],
      },
    });
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

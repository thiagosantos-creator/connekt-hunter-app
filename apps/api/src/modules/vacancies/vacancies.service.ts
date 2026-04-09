import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class VacanciesService {
  create(data: { organizationId: string; title: string; description: string; createdBy: string }) {
    return prisma.vacancy.create({ data });
  }

  findAll() {
    return prisma.vacancy.findMany({ include: { organization: true } });
  }
}

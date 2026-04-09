import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class OrganizationsService {
  create(data: { name: string; createdBy: string }) {
    return prisma.organization.create({ data });
  }

  findAll() {
    return prisma.organization.findMany();
  }
}

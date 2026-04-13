import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class OrganizationsService {
  async create(data: { name: string; status?: string; ownerAdminUserId?: string }, actorUserId: string) {
    const org = await prisma.organization.create({
      data: {
        name: data.name,
        status: data.status ?? 'active',
        ownerAdminUserId: data.ownerAdminUserId ?? actorUserId,
      },
    });
    await prisma.tenantPolicy.create({
      data: { organizationId: org.id },
    });
    return org;
  }

  findAll() {
    return prisma.organization.findMany({
      include: {
        tenantPolicy: true,
      },
    });
  }
}

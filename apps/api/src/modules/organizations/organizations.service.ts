import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class OrganizationsService {
  async create(data: { name: string; status?: string; ownerAdminUserId?: string }, actorUserId: string) {
    const ownerAdminUserId = data.ownerAdminUserId?.trim() || actorUserId;
    const org = await prisma.organization.create({
      data: {
        name: data.name,
        status: data.status ?? 'active',
        ownerAdminUserId,
      },
    });
    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: ownerAdminUserId } },
      update: { role: 'admin' },
      create: { organizationId: org.id, userId: ownerAdminUserId, role: 'admin' },
    });
    await prisma.tenantPolicy.create({
      data: { organizationId: org.id },
    });
    await prisma.tenantSettings.create({
      data: {
        organizationId: org.id,
        planSegment: 'standard',
        timezone: 'America/Sao_Paulo',
        operationalCalendar: 'business-days',
      },
    });
    await prisma.auditEvent.create({
      data: {
        actorId: actorUserId,
        action: 'organization.created',
        entityType: 'organization',
        entityId: org.id,
        metadata: { ownerAdminUserId, status: org.status } as never,
      },
    });
    return prisma.organization.findUniqueOrThrow({
      where: { id: org.id },
      include: { tenantPolicy: true, tenantSettings: true },
    });
  }

  findAll() {
    return prisma.organization.findMany({
      include: {
        tenantPolicy: true,
        tenantSettings: true,
      },
    });
  }
}

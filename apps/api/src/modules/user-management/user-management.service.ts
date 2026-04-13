import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { NotificationDispatchService } from '../notification-preferences/notification-dispatch.service.js';

@Injectable()
export class UserManagementService {
  constructor(
    @Inject(NotificationDispatchService) private readonly notificationDispatchService: NotificationDispatchService,
  ) {}

  async list(organizationId: string, actorId: string, role: string) {
    await this.assertAccess(organizationId, actorId, role);

    const memberships = await prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          include: {
            notificationPreference: true,
          },
        },
      },
      orderBy: { user: { email: 'asc' } },
    });

    return memberships.map((membership) => ({
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      role: membership.role,
      tenantId: membership.organizationId,
      isActive: membership.user.isActive,
      notificationPreference: membership.user.notificationPreference,
    }));
  }

  async update(
    organizationId: string,
    userId: string,
    actorId: string,
    role: string,
    payload: { role?: 'admin' | 'headhunter' | 'client'; isActive?: boolean },
  ) {
    await this.assertAccess(organizationId, actorId, role);

    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: { user: true },
    });
    if (!membership) throw new NotFoundException('user_not_found_in_organization');

    if (payload.role) {
      await prisma.membership.update({
        where: { organizationId_userId: { organizationId, userId } },
        data: { role: payload.role },
      });
    }

    if (payload.isActive != null) {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: payload.isActive },
      });
    }

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'user-management.updated',
        entityType: 'user',
        entityId: userId,
        metadata: { organizationId, ...payload } as never,
      },
    });

    await this.notificationDispatchService.dispatchToUsers({
      organizationId,
      userIds: [userId],
      actorId,
      eventKey: 'access.changed',
      metadata: payload,
    });

    return prisma.membership.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId, userId } },
      include: { user: { include: { notificationPreference: true } } },
    }).then((updated) => ({
      id: updated.user.id,
      email: updated.user.email,
      name: updated.user.name,
      role: updated.role,
      tenantId: updated.organizationId,
      isActive: updated.user.isActive,
      notificationPreference: updated.user.notificationPreference,
    }));
  }

  private async assertAccess(organizationId: string, actorId: string, role: string) {
    if (role === 'admin') return;
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId: actorId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }
}

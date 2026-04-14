import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { NotificationDispatchService } from '../notification-preferences/notification-dispatch.service.js';
import { StorageGateway } from '../integrations/storage.gateway.js';

@Injectable()
export class UserManagementService {
  constructor(
    @Inject(NotificationDispatchService) private readonly notificationDispatchService: NotificationDispatchService,
    @Inject(StorageGateway) private readonly storageGateway: StorageGateway,
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

    return memberships.map((membership) => this.toManagedUser(membership));
  }

  async create(
    organizationId: string,
    actorId: string,
    role: string,
    payload: { email: string; name: string; role: 'admin' | 'headhunter' | 'client'; title?: string },
  ) {
    await this.assertAccess(organizationId, actorId, role);

    const user = await prisma.user.upsert({
      where: { email: payload.email.trim().toLowerCase() },
      update: {
        name: payload.name.trim(),
        title: payload.title?.trim() || null,
        role: payload.role,
        isActive: true,
      },
      create: {
        email: payload.email.trim().toLowerCase(),
        name: payload.name.trim(),
        title: payload.title?.trim() || null,
        role: payload.role,
      },
    });

    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      update: { role: payload.role },
      create: { organizationId, userId: user.id, role: payload.role },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'user-management.created',
        entityType: 'user',
        entityId: user.id,
        metadata: { organizationId, email: user.email, role: payload.role } as never,
      },
    });

    await this.notificationDispatchService.dispatchToUsers({
      organizationId,
      userIds: [user.id],
      actorId,
      eventKey: 'access.changed',
      metadata: { created: true, role: payload.role },
    });

    const createdMembership = await prisma.membership.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      include: { user: { include: { notificationPreference: true } } },
    });

    return this.toManagedUser(createdMembership);
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

    const updated = await prisma.membership.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId, userId } },
      include: { user: { include: { notificationPreference: true } } },
    });

    return this.toManagedUser(updated);
  }

  private async assertAccess(organizationId: string, actorId: string, role: string) {
    if (role === 'admin') return;
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId: actorId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }

  async updateMe(userId: string, payload: { name?: string; title?: string; avatarUrl?: string }) {
    const data: Record<string, string> = {};
    if (payload.name) data.name = payload.name;
    if (payload.title != null) data.title = payload.title;
    if (payload.avatarUrl != null) data.avatarUrl = payload.avatarUrl;

    if (Object.keys(data).length === 0) return { ok: true };

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    await prisma.auditEvent.create({
      data: {
        actorId: userId,
        action: 'user-management.profile-updated',
        entityType: 'user',
        entityId: user.id,
        metadata: { fields: Object.keys(data) } as never,
      },
    });

    return { ok: true };
  }

  async createAvatarUpload(userId: string, filename: string, contentType?: string) {
    const tenantId = await this.resolveStorageTenantId(userId);
    const upload = await this.storageGateway.createPresignedUpload({
      tenantId,
      namespace: `user-avatar/${userId}`,
      filename,
      contentType,
    });

    await this.storageGateway.recordAsset({
      tenantId,
      objectKey: upload.objectKey,
      category: 'user-avatar',
      provider: upload.provider,
      metadata: { userId, filename, status: 'pending_upload' },
    });

    const baseEndpoint = process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`
      : `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION || process.env.S3_REGION}.amazonaws.com`;
      
    const publicUrl = `${baseEndpoint}/${upload.objectKey}`;

    return { 
      uploadUrl: upload.url, 
      uploadMethod: upload.method, 
      uploadHeaders: upload.headers, 
      publicUrl, 
      objectKey: upload.objectKey 
    };
  }

  async confirmAvatarUpload(userId: string, objectKey: string) {
    const tenantId = await this.resolveStorageTenantId(userId);
    const expectedPrefix = `${tenantId}/user-avatar/${userId}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
      throw new BadRequestException('invalid_avatar_object_key');
    }

    await this.storageGateway.getObjectBuffer(objectKey);

    const bucket = process.env.S3_BUCKET ?? 'connekt-staging-assets';
    const region = process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
    const avatarUrl = process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT}/${bucket}/${objectKey}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: userId,
        action: 'user-management.avatar-updated',
        entityType: 'user',
        entityId: userId,
        metadata: { objectKey, tenantId } as never,
      },
    });

    return { ok: true, avatarUrl };
  }

  private toManagedUser(membership: {
    organizationId: string;
    role: string;
    user: {
      id: string;
      email: string;
      name: string;
      title?: string | null;
      avatarUrl?: string | null;
      isActive: boolean;
      notificationPreference?: unknown;
    };
  }) {
    return {
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      role: membership.role,
      tenantId: membership.organizationId,
      title: membership.user.title ?? undefined,
      avatarUrl: membership.user.avatarUrl ?? undefined,
      isActive: membership.user.isActive,
      notificationPreference: membership.user.notificationPreference,
    };
  }

  private async resolveStorageTenantId(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      orderBy: { organizationId: 'asc' },
    });
    return membership?.organizationId ?? userId;
  }
}

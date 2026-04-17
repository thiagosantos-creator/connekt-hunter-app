import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { StorageGateway } from '../integrations/storage.gateway.js';

type OrganizationBrandingPayload = {
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  publicName?: string;
  communicationDomain?: string;
  contactEmail?: string;
};

@Injectable()
export class OrganizationsService {
  constructor(@Inject(StorageGateway) private readonly storageGateway: StorageGateway) {}

  async create(data: { name: string; status?: string; ownerAdminUserId?: string }, actorUserId: string) {
    const ownerAdminUserId = await this.resolveOwnerAdminUserId(data.ownerAdminUserId, actorUserId);
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

  async update(
    organizationId: string,
    data: {
      name?: string;
      status?: string;
      ownerAdminUserId?: string;
      branding?: OrganizationBrandingPayload;
    },
    actorUserId: string,
  ) {
    const existing = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { tenantPolicy: true, tenantSettings: true },
    });

    const nextOwnerAdminUserId = await this.resolveOwnerAdminUserId(data.ownerAdminUserId, existing.ownerAdminUserId ?? undefined);

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: data.name ?? existing.name,
        status: data.status ?? existing.status,
        ownerAdminUserId: nextOwnerAdminUserId,
      },
    });

    if (nextOwnerAdminUserId) {
      await prisma.membership.upsert({
        where: { organizationId_userId: { organizationId, userId: nextOwnerAdminUserId } },
        update: { role: 'admin' },
        create: { organizationId, userId: nextOwnerAdminUserId, role: 'admin' },
      });
    }

    const branding = data.branding;
    if (branding) {
      await prisma.tenantSettings.upsert({
        where: { organizationId },
        create: {
          organizationId,
          planSegment: existing.tenantSettings?.planSegment ?? 'standard',
          timezone: existing.tenantSettings?.timezone ?? 'America/Sao_Paulo',
          operationalCalendar: existing.tenantSettings?.operationalCalendar ?? 'business-days',
          logoUrl: branding.logoUrl,
          bannerUrl: branding.bannerUrl,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          publicName: branding.publicName,
          communicationDomain: branding.communicationDomain,
          contactEmail: branding.contactEmail,
        },
        update: {
          logoUrl: branding.logoUrl,
          bannerUrl: branding.bannerUrl,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          publicName: branding.publicName,
          communicationDomain: branding.communicationDomain,
          contactEmail: branding.contactEmail,
        },
      });
    }

    await prisma.auditEvent.create({
      data: {
        actorId: actorUserId,
        action: 'organization.updated',
        entityType: 'organization',
        entityId: org.id,
        metadata: {
          before: {
            name: existing.name,
            status: existing.status,
            ownerAdminUserId: existing.ownerAdminUserId,
            branding: existing.tenantSettings
              ? {
                  logoUrl: existing.tenantSettings.logoUrl,
                  bannerUrl: existing.tenantSettings.bannerUrl,
                  primaryColor: existing.tenantSettings.primaryColor,
                  secondaryColor: existing.tenantSettings.secondaryColor,
                  publicName: existing.tenantSettings.publicName,
                  communicationDomain: existing.tenantSettings.communicationDomain,
                  contactEmail: existing.tenantSettings.contactEmail,
                }
              : null,
          },
          after: {
            name: data.name ?? existing.name,
            status: data.status ?? existing.status,
            ownerAdminUserId: nextOwnerAdminUserId,
            branding: branding ?? null,
          },
        } as never,
      },
    });

    return prisma.organization.findUniqueOrThrow({
      where: { id: org.id },
      include: { tenantPolicy: true, tenantSettings: true },
    });
  }

  findAll() {
    return prisma.organization.findMany({
      orderBy: { name: 'asc' },
      include: {
        tenantPolicy: true,
        tenantSettings: true,
      },
    });
  }

  findManyByIds(ids: string[]) {
    return prisma.organization.findMany({
      where: { id: { in: ids } },
      orderBy: { name: 'asc' },
      include: {
        tenantPolicy: true,
        tenantSettings: true,
      },
    });
  }

  async createBrandingUpload(organizationId: string, type: 'logo' | 'banner', filename: string, contentType?: string) {
    const upload = await this.storageGateway.createPresignedUpload({
      tenantId: organizationId,
      namespace: `org-branding/${organizationId}/${type}`,
      filename,
      contentType,
    });

    await this.storageGateway.recordAsset({
      tenantId: organizationId,
      objectKey: upload.objectKey,
      category: `org-${type}`,
      provider: upload.provider,
      metadata: { organizationId, type, filename, status: 'pending_upload' },
    });

    const publicUrl = `${this.storageGateway.getPublicAssetBaseUrl()}/${upload.objectKey}`;

    return { 
      uploadUrl: upload.url, 
      uploadMethod: upload.method, 
      uploadHeaders: upload.headers, 
      publicUrl, 
      objectKey: upload.objectKey 
    };
  }

  async confirmBrandingUpload(organizationId: string, type: 'logo' | 'banner', objectKey: string, actorUserId: string) {
    const expectedPrefix = `${organizationId}/org-branding/${organizationId}/${type}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
      throw new BadRequestException('invalid_branding_object_key');
    }

    await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    await this.storageGateway.getObjectBuffer(objectKey);

    const publicUrl = `${this.storageGateway.getPublicAssetBaseUrl()}/${objectKey}`;

    await prisma.tenantSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planSegment: 'standard',
        timezone: 'America/Sao_Paulo',
        operationalCalendar: 'business-days',
        ...(type === 'logo' ? { logoUrl: publicUrl } : { bannerUrl: publicUrl }),
      },
      update: type === 'logo' ? { logoUrl: publicUrl } : { bannerUrl: publicUrl },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: actorUserId,
        action: `organization.branding.${type}-updated`,
        entityType: 'organization',
        entityId: organizationId,
        metadata: { objectKey, publicUrl } as never,
      },
    });

    return { ok: true, publicUrl };
  }

  private async resolveOwnerAdminUserId(ownerAdminRef?: string, fallbackUserId?: string): Promise<string> {
    const normalized = ownerAdminRef?.trim();
    if (!normalized) {
      if (!fallbackUserId) throw new BadRequestException('owner_admin_user_id_required');
      return fallbackUserId;
    }

    const byId = await prisma.user.findUnique({ where: { id: normalized } });
    if (byId) return byId.id;

    const byEmail = await prisma.user.findUnique({ where: { email: normalized.toLowerCase() } });
    if (byEmail) return byEmail.id;

    throw new NotFoundException('owner_admin_user_not_found');
  }
}

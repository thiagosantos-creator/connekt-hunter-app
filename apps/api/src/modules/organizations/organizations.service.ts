import { Inject, Injectable } from '@nestjs/common';
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

    const nextOwnerAdminUserId = data.ownerAdminUserId?.trim() || existing.ownerAdminUserId || undefined;

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

  async createBrandingUpload(organizationId: string, type: 'logo' | 'banner', filename: string, contentType?: string) {
    const upload = await this.storageGateway.createPresignedUpload({
      namespace: `org-branding/${organizationId}/${type}`,
      filename,
      contentType,
      category: `org-${type}`,
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
}

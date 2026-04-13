import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

export interface TenantSettingsPayload {
  planSegment: string;
  slaResponseHours: number;
  slaClosureHours: number;
  timezone: string;
  operationalCalendar: string;
  tenantStatus: 'trial' | 'active' | 'suspended';
  branding: {
    logoUrl?: string;
    bannerUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    publicName?: string;
    communicationDomain?: string;
  };
  policy: {
    dataRetentionDays: number;
    auditRetentionDays: number;
    mfaRequiredRoles: string[];
    maxSessionMinutes: number;
    communicationWindowStart: string;
    communicationWindowEnd: string;
    frequencyLimitPerDay: number;
  };
}

@Injectable()
export class EnterpriseGovernanceService {
  async getSettings(organizationId: string, actorId: string, role: string) {
    await this.assertAccess(organizationId, actorId, role);

    return prisma.tenantSettings.upsert({
      where: { organizationId },
      update: {},
      create: {
        organizationId,
        planSegment: 'standard',
        timezone: 'UTC',
        operationalCalendar: 'business-days',
      },
      include: { policyVersions: { orderBy: { version: 'desc' }, take: 1 } },
    });
  }

  async getHistory(organizationId: string, actorId: string, role: string) {
    await this.assertAccess(organizationId, actorId, role);
    return prisma.tenantPolicyVersion.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async upsertSettings(organizationId: string, actorId: string, role: string, payload: TenantSettingsPayload) {
    await this.assertAccess(organizationId, actorId, role);

    const current = await prisma.tenantSettings.findUnique({ where: { organizationId } });
    const nextVersion = await prisma.tenantPolicyVersion.count({ where: { organizationId } }) + 1;

    const settings = await prisma.tenantSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planSegment: payload.planSegment,
        slaResponseHours: payload.slaResponseHours,
        slaClosureHours: payload.slaClosureHours,
        timezone: payload.timezone,
        operationalCalendar: payload.operationalCalendar,
        tenantStatus: payload.tenantStatus,
        logoUrl: payload.branding.logoUrl,
        bannerUrl: payload.branding.bannerUrl,
        primaryColor: payload.branding.primaryColor,
        secondaryColor: payload.branding.secondaryColor,
        publicName: payload.branding.publicName,
        communicationDomain: payload.branding.communicationDomain,
      },
      update: {
        planSegment: payload.planSegment,
        slaResponseHours: payload.slaResponseHours,
        slaClosureHours: payload.slaClosureHours,
        timezone: payload.timezone,
        operationalCalendar: payload.operationalCalendar,
        tenantStatus: payload.tenantStatus,
        logoUrl: payload.branding.logoUrl,
        bannerUrl: payload.branding.bannerUrl,
        primaryColor: payload.branding.primaryColor,
        secondaryColor: payload.branding.secondaryColor,
        publicName: payload.branding.publicName,
        communicationDomain: payload.branding.communicationDomain,
      },
    });

    await prisma.tenantPolicyVersion.create({
      data: {
        organizationId,
        version: nextVersion,
        policyJson: payload.policy as never,
        changedBy: actorId,
        previousPolicyJson: current ? {
          dataRetentionDays: current.dataRetentionDays,
          auditRetentionDays: current.auditRetentionDays,
          mfaRequiredRoles: current.mfaRequiredRoles,
          maxSessionMinutes: current.maxSessionMinutes,
          communicationWindowStart: current.communicationWindowStart,
          communicationWindowEnd: current.communicationWindowEnd,
          frequencyLimitPerDay: current.frequencyLimitPerDay,
        } as never : undefined,
      },
    });

    await prisma.tenantSettings.update({
      where: { organizationId },
      data: {
        dataRetentionDays: payload.policy.dataRetentionDays,
        auditRetentionDays: payload.policy.auditRetentionDays,
        mfaRequiredRoles: payload.policy.mfaRequiredRoles,
        maxSessionMinutes: payload.policy.maxSessionMinutes,
        communicationWindowStart: payload.policy.communicationWindowStart,
        communicationWindowEnd: payload.policy.communicationWindowEnd,
        frequencyLimitPerDay: payload.policy.frequencyLimitPerDay,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'tenant-settings.updated',
        entityType: 'tenant-settings',
        entityId: settings.id,
        metadata: { organizationId, version: nextVersion, before: current, after: payload } as never,
      },
    });

    return settings;
  }

  private async assertAccess(organizationId: string, actorId: string, role: string) {
    if (role === 'admin') return;
    const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: actorId } } });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class TenantPoliciesService {
  async getByOrganization(organizationId: string, actorId: string, role: string) {
    await this.assertAccess(organizationId, actorId, role);
    return prisma.tenantPolicy.upsert({
      where: { organizationId },
      update: {},
      create: { organizationId },
    });
  }

  async upsertByOrganization(
    organizationId: string,
    actorId: string,
    role: string,
    payload: { canInviteCandidates: boolean; canApproveDecisions: boolean; canAuditEvents: boolean; canAdministrateTenant: boolean },
  ) {
    await this.assertAccess(organizationId, actorId, role);
    return prisma.tenantPolicy.upsert({
      where: { organizationId },
      update: payload,
      create: { organizationId, ...payload },
    });
  }

  private async assertAccess(organizationId: string, actorId: string, role: string) {
    if (role === 'admin') return;
    const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: actorId } } });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }
}

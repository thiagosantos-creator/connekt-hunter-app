import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

export interface PermissionRuleInput {
  resource: string;
  action: 'read' | 'create' | 'update' | 'approve' | 'export' | 'audit';
  scope: 'own' | 'team' | 'tenant';
  allowed: boolean;
}

@Injectable()
export class AccessControlService {
  async listPolicies(organizationId: string, actorId: string, role: string) {
    await this.assertAccess(organizationId, actorId, role);
    return prisma.rolePolicy.findMany({ where: { organizationId }, orderBy: [{ roleKey: 'asc' }, { resource: 'asc' }] });
  }

  async upsertPolicy(organizationId: string, actorId: string, role: string, roleKey: string, rules: PermissionRuleInput[]) {
    await this.assertAccess(organizationId, actorId, role);

    await prisma.rolePolicy.deleteMany({ where: { organizationId, roleKey } });
    const created = await prisma.rolePolicy.createMany({
      data: rules.map((rule) => ({ organizationId, roleKey, ...rule, updatedBy: actorId })),
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'access-policy.updated',
        entityType: 'role-policy',
        entityId: `${organizationId}:${roleKey}`,
        metadata: { organizationId, roleKey, rulesCount: rules.length, createdCount: created.count } as never,
      },
    });

    return { ok: true, created: created.count };
  }

  async createTemporaryGrant(
    organizationId: string,
    actorId: string,
    role: string,
    payload: { userId: string; resource: string; action: string; scope: string; expiresAt: string },
  ) {
    await this.assertAccess(organizationId, actorId, role);
    const grant = await prisma.permissionGrant.create({
      data: {
        organizationId,
        userId: payload.userId,
        grantedBy: actorId,
        resource: payload.resource,
        action: payload.action,
        scope: payload.scope,
        expiresAt: new Date(payload.expiresAt),
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'access-grant.temporary-created',
        entityType: 'permission-grant',
        entityId: grant.id,
        metadata: payload as never,
      },
    });

    return grant;
  }

  async simulateAccess(
    organizationId: string,
    actorId: string,
    role: string,
    payload: { roleKey: string; resource: string; action: string; scope: string },
  ) {
    await this.assertAccess(organizationId, actorId, role);
    const match = await prisma.rolePolicy.findFirst({
      where: {
        organizationId,
        roleKey: payload.roleKey,
        resource: payload.resource,
        action: payload.action,
        scope: payload.scope,
        allowed: true,
      },
    });
    return { allowed: Boolean(match), rationale: match ? 'policy_match' : 'policy_missing' };
  }

  private async assertAccess(organizationId: string, actorId: string, role: string) {
    if (role === 'admin') return;
    const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: actorId } } });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }
}

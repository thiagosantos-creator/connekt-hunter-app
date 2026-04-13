import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class ExecutiveDashboardService {
  async getDashboard(organizationId: string, actorId: string, role: string, period: string) {
    await this.assertAccess(organizationId, actorId, role);

    const snapshots = await prisma.tenantKpiSnapshot.findMany({
      where: { organizationId, period },
      orderBy: { capturedAt: 'desc' },
      take: 8,
    });

    const latest = snapshots[0];
    return {
      period,
      latest,
      trend: snapshots,
      funnel: {
        invited: latest?.invites ?? 0,
        responded: latest?.responses ?? 0,
        shortlisted: latest?.shortlisted ?? 0,
        approved: latest?.approved ?? 0,
        onboarded: latest?.onboarded ?? 0,
      },
      formulas: {
        inviteResponseRate: 'responses / invites',
        approvalRate: 'approved / shortlisted',
        slaComplianceRate: 'slaMet / totalSlaTracked',
      },
    };
  }

  async exportCsv(organizationId: string, actorId: string, role: string): Promise<string> {
    await this.assertAccess(organizationId, actorId, role);
    const snapshots = await prisma.tenantKpiSnapshot.findMany({ where: { organizationId }, orderBy: { capturedAt: 'desc' }, take: 52 });
    const header = 'capturedAt,period,invites,responses,shortlisted,approved,onboarded,slaMet,slaBreached';
    const lines = snapshots.map((s) => `${s.capturedAt.toISOString()},${s.period},${s.invites},${s.responses},${s.shortlisted},${s.approved},${s.onboarded},${s.slaMet},${s.slaBreached}`);
    return [header, ...lines].join('\n');
  }

  private async assertAccess(organizationId: string, actorId: string, role: string) {
    if (role === 'admin') return;
    const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: actorId } } });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

export type InboxPriority = 'high' | 'medium' | 'low';

@Injectable()
export class HeadhunterInboxService {
  async list(actorId: string, role: string, filters: { organizationId?: string; vacancyId?: string; status?: string; priority?: InboxPriority }) {
    const organizationId = filters.organizationId;
    if (!organizationId) return [];
    if (role !== 'admin') {
      const member = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: actorId } } });
      if (!member) throw new ForbiddenException('user_not_member_of_org');
    }

    const apps = await prisma.application.findMany({
      where: {
        vacancy: { organizationId, ...(filters.vacancyId ? { id: filters.vacancyId } : {}) },
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: { vacancy: true, candidate: true, shortlistItems: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    const cadences = await prisma.inviteFollowUpCadence.findMany({
      where: { organizationId },
      include: { attempts: true },
    });

    const cadenceByPair = new Map(cadences.map((c) => [`${c.candidateId}:${c.vacancyId}`, c]));

    const items = apps.map((app) => {
      const ageHours = Math.max(1, Math.floor((Date.now() - app.createdAt.getTime()) / (1000 * 60 * 60)));
      const cadence = cadenceByPair.get(`${app.candidateId}:${app.vacancyId}`);
      const attemptsPending = cadence?.attempts.filter((a) => a.status === 'queued').length ?? 0;
      const score = ageHours + (app.status === 'submitted' ? 25 : 5) + attemptsPending * 10 + (app.shortlistItems.length === 0 ? 20 : 0);
      const priority: InboxPriority = score >= 72 ? 'high' : score >= 36 ? 'medium' : 'low';
      return {
        id: `${app.id}:${priority}`,
        type: app.status === 'submitted' ? 'invite_no_response' : 'pipeline_followup',
        applicationId: app.id,
        candidateId: app.candidateId,
        candidateEmail: app.candidate.email,
        vacancyId: app.vacancyId,
        vacancyTitle: app.vacancy.title,
        status: app.status,
        score,
        priority,
        ageHours,
        quickActions: ['resend-invite', 'open-candidate', 'add-note', 'change-status'],
      };
    }).sort((a, b) => b.score - a.score);

    return filters.priority ? items.filter((item) => item.priority === filters.priority) : items;
  }
}

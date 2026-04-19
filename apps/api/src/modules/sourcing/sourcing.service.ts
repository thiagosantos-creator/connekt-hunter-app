import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { CandidatesService } from '../candidates/candidates.service.js';
import { CandidateMatchingService } from '../candidate-matching/candidate-matching.service.js';

@Injectable()
export class SourcingService {
  constructor(
    @Inject(CandidatesService) private readonly candidatesService: CandidatesService,
    @Inject(CandidateMatchingService) private readonly matchingService: CandidateMatchingService,
  ) {}

  async searchCandidates(query: string, organizationId: string) {
    const candidates = await prisma.candidate.findMany({
      where: {
        organizationId,
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { profile: { fullName: { contains: query, mode: 'insensitive' } } }
        ]
      },
      include: {
        profile: true,
        onboarding: { include: { resumes: { include: { parseResult: true } } } },
        _count: { select: { applications: true } }
      },
      take: 20
    });

    return candidates.map(c => ({
      id: c.id,
      email: c.email,
      fullName: c.profile?.fullName || 'Candidato Sem Nome',
      photoUrl: c.profile?.photoUrl,
      applicationsCount: c._count.applications,
      skills: (c.onboarding?.resumes[0]?.parseResult?.parsedJson as any)?.skills || []
    }));
  }

  async checkShortlistConflicts(candidateId: string, organizationId: string) {
    const activeShortlists = await prisma.shortlistItem.findMany({
      where: {
        application: {
          candidateId,
          vacancy: {
            organizationId,
            status: { in: ['published', 'paused'] }
          }
        }
      },
      include: {
        shortlist: {
          include: {
            vacancy: { select: { id: true, title: true } }
          }
        }
      }
    });

    return activeShortlists.map(item => ({
      vacancyId: item.shortlist.vacancy.id,
      vacancyTitle: item.shortlist.vacancy.title,
      addedAt: item.createdAt
    }));
  }

  async getFitInsight(candidateId: string, vacancyId: string, actorId: string) {
    return this.matchingService.computeOnDemandMatching(candidateId, vacancyId, actorId);
  }

  async inviteToVacancy(input: {
    candidateId: string;
    vacancyId: string;
    organizationId: string;
    channel: 'email' | 'phone';
    actorUserId: string;
  }) {
    const candidate = await prisma.candidate.findUnique({ where: { id: input.candidateId } });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    return this.candidatesService.invite({
      organizationId: input.organizationId,
      vacancyId: input.vacancyId,
      channel: input.channel,
      destination: input.channel === 'email' ? candidate.email : (candidate.phone || ''),
      consent: true,
      actorUserId: input.actorUserId
    });
  }
}

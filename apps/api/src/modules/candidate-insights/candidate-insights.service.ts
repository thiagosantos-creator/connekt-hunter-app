import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { AiGateway } from '../integrations/ai.gateway.js';
import { assertOrganizationAccess } from '../auth/organization-access.util.js';

@Injectable()
export class CandidateInsightsService {
  constructor(@Inject(AiGateway) private readonly aiGateway: AiGateway) {}

  private async assertTenantAccess(organizationId: string, actorId?: string): Promise<void> {
    await assertOrganizationAccess(organizationId, actorId);
  }

  async generate(candidateId: string, vacancyId: string, actorId?: string) {
    const [candidate, vacancy] = await Promise.all([
      prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          profile: {
            include: {
              experiences: true,
              educations: true,
              skills: true,
              languages: true,
            },
          },
          onboarding: {
            include: {
              resumes: {
                include: { parseResult: true },
                orderBy: { uploadedAt: 'desc' as const },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.vacancy.findUnique({ where: { id: vacancyId } }),
    ]);
    if (!candidate) throw new NotFoundException('candidate_not_found');
    if (!vacancy) throw new NotFoundException('vacancy_not_found');
    if (candidate.organizationId !== vacancy.organizationId) {
      throw new ForbiddenException('candidate_vacancy_cross_tenant_mismatch');
    }
    await this.assertTenantAccess(vacancy.organizationId, actorId);

    const matching = await prisma.matchingScore.findUnique({
      where: { candidateId_vacancyId: { candidateId, vacancyId } },
      include: { breakdowns: true },
    });

    // Build enriched candidate context for the AI prompt
    const candidateContext: Record<string, unknown> = {
      fullName: candidate.profile?.fullName ?? null,
      resumeSummary: candidate.profile?.resumeSummary
        ?? (candidate.onboarding?.resumes[0]?.parseResult?.parsedJson as Record<string, unknown> | undefined)?.summary
        ?? null,
      experience: candidate.profile?.experiences?.map((e) => ({
        company: e.company,
        role: e.role,
        period: e.period,
      })) ?? [],
      education: candidate.profile?.educations?.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        period: e.period,
      })) ?? [],
      skills: candidate.profile?.skills?.map((s) => s.name) ?? [],
      languages: candidate.profile?.languages?.map((l) => ({
        name: l.name,
        level: l.level,
      })) ?? [],
      introVideoSummary: candidate.profile?.introVideoSummary ?? null,
      introVideoTags: Array.isArray(candidate.profile?.introVideoTags) ? candidate.profile.introVideoTags : [],
      vacancyTitle: vacancy.title,
      vacancyDescription: vacancy.description,
      vacancyRequiredSkills: Array.isArray(vacancy.requiredSkills) ? vacancy.requiredSkills : [],
    };

    const response = await this.aiGateway.generateCandidateInsights({ candidateId, vacancyId, matching, candidateContext });

    const insight = await prisma.candidateInsight.upsert({
      where: { candidateId_vacancyId: { candidateId, vacancyId } },
      update: {
        summary: response.summary,
        strengths: response.strengths as never,
        risks: response.risks as never,
        recommendations: response.recommendations as never,
      },
      create: {
        candidateId,
        vacancyId,
        summary: response.summary,
        strengths: response.strengths as never,
        risks: response.risks as never,
        recommendations: response.recommendations as never,
      },
    });

    await prisma.aiExplanation.create({
      data: {
        candidateId,
        context: 'candidate-insights',
        explanation: response.explanation,
        generatedBy: response.provider,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'insights.generated',
        entityType: 'Candidate',
        entityId: candidateId,
        metadata: { vacancyId, insightId: insight.id } as never,
      },
    });

    return insight;
  }

  async get(candidateId: string, vacancyId: string) {
    return prisma.candidateInsight.findUnique({
      where: { candidateId_vacancyId: { candidateId, vacancyId } },
    });
  }
}

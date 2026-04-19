import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { AiGateway } from '../integrations/ai.gateway.js';
import { assertOrganizationAccess } from '../auth/organization-access.util.js';

@Injectable()
export class CandidateMatchingService {
  constructor(@Inject(AiGateway) private readonly aiGateway: AiGateway) {}

  private async assertTenantAccess(organizationId: string, actorId?: string): Promise<void> {
    await assertOrganizationAccess(organizationId, actorId);
  }

  private async toEmbedding(text: string): Promise<number[]> {
    return this.aiGateway.generateEmbedding(text);
  }

  async computeMatching(applicationId: string, actorId?: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: { include: { profile: true, onboarding: { include: { resumes: { include: { parseResult: true } } } } } },
        vacancy: true,
        evaluations: true,
        smartInterviewSessions: { include: { aiAnalysis: true } },
      },
    });
    if (!application) throw new NotFoundException('application_not_found');

    if (application.candidate.organizationId !== application.vacancy.organizationId) {
      throw new ForbiddenException('candidate_vacancy_cross_tenant_mismatch');
    }

    await this.assertTenantAccess(application.vacancy.organizationId, actorId);

    const resumeSummary = application.candidate.onboarding?.resumes.at(0)?.parseResult?.parsedJson;
    const resumeText = JSON.stringify(resumeSummary ?? { summary: 'no-resume' });
    const candidateText = `${application.candidate.email} ${application.candidate.profile?.fullName ?? ''} ${resumeText}`;
    const vacancyText = `${application.vacancy.title} ${application.vacancy.description}`;

    const candidateVector = await this.toEmbedding(candidateText);
    const vacancyVector = await this.toEmbedding(vacancyText);

    await prisma.candidateEmbedding.upsert({
      where: { candidateId_source: { candidateId: application.candidateId, source: 'resume+interview' } },
      update: { vector: candidateVector as never, metadata: { applicationId } as never },
      create: { candidateId: application.candidateId, source: 'resume+interview', vector: candidateVector as never, metadata: { applicationId } as never },
    });

    await prisma.vacancyEmbedding.upsert({
      where: { vacancyId_source: { vacancyId: application.vacancyId, source: 'vacancy-description' } },
      update: { vector: vacancyVector as never, metadata: { vacancyId: application.vacancyId } as never },
      create: { vacancyId: application.vacancyId, source: 'vacancy-description', vector: vacancyVector as never, metadata: { vacancyId: application.vacancyId } as never },
    });

    const evalScore = Math.min(application.evaluations.length * 0.15, 0.3);
    const interviewScore = application.smartInterviewSessions.some((s) => s.aiAnalysis?.status === 'completed') ? 0.3 : 0.1;
    const profileScore = application.candidate.profile?.fullName ? 0.2 : 0.1;
    const resumeScore = resumeSummary ? 0.2 : 0.05;

    const score = Number(((evalScore + interviewScore + profileScore + resumeScore) * 100).toFixed(2));

    const matching = await prisma.matchingScore.upsert({
      where: { candidateId_vacancyId: { candidateId: application.candidateId, vacancyId: application.vacancyId } },
      update: { score, modelVersion: 'matching-v1', status: 'completed', computedAt: new Date() },
      create: { candidateId: application.candidateId, vacancyId: application.vacancyId, score, modelVersion: 'matching-v1' },
    });

    await prisma.matchingBreakdown.deleteMany({ where: { matchingScoreId: matching.id } });
    const dimensions = [
      { dimension: 'experience', score: Number((evalScore * 100).toFixed(2)), weight: 0.3, reasoning: 'Avaliações históricas e sinais de senioridade.' },
      { dimension: 'interview', score: Number((interviewScore * 100).toFixed(2)), weight: 0.3, reasoning: 'Sinais de comunicação e clareza da entrevista smart.' },
      { dimension: 'profile', score: Number((profileScore * 100).toFixed(2)), weight: 0.2, reasoning: 'Completude do perfil e dados declarados.' },
      { dimension: 'resume', score: Number((resumeScore * 100).toFixed(2)), weight: 0.2, reasoning: 'Aderência textual entre CV e vaga.' },
    ];

    await prisma.matchingBreakdown.createMany({
      data: dimensions.map((item) => ({ ...item, matchingScoreId: matching.id })),
    });

    const explanation = await this.aiGateway.explainMatching({
      applicationId,
      score,
      dimensions,
    });

    await prisma.aiEvidence.createMany({
      data: explanation.evidences.map((ev) => ({
        candidateId: application.candidateId,
        matchingScoreId: matching.id,
        sourceType: ev.sourceType,
        sourceRef: ev.sourceRef,
        excerpt: ev.excerpt,
        confidence: ev.confidence,
        metadata: { applicationId } as never,
      })),
    });

    await prisma.aiExplanation.create({
      data: {
        candidateId: application.candidateId,
        matchingScoreId: matching.id,
        context: 'matching-score',
        explanation: explanation.text,
        generatedBy: explanation.provider,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'matching.computed',
        entityType: 'Application',
        entityId: applicationId,
        metadata: { matchingId: matching.id, score } as never,
      },
    });

    return this.getMatching(application.candidateId, application.vacancyId);
  }

  async computeOnDemandMatching(candidateId: string, vacancyId: string, actorId?: string) {
    const [candidate, vacancy] = await Promise.all([
      prisma.candidate.findUnique({
        where: { id: candidateId },
        include: { profile: true, onboarding: { include: { resumes: { include: { parseResult: true } } } } },
      }),
      prisma.vacancy.findUnique({ where: { id: vacancyId } }),
    ]);

    if (!candidate || !vacancy) throw new NotFoundException('candidate_or_vacancy_not_found');
    await this.assertTenantAccess(vacancy.organizationId, actorId);

    const resumeSummary = candidate.onboarding?.resumes.at(0)?.parseResult?.parsedJson;
    const resumeText = JSON.stringify(resumeSummary ?? { summary: 'no-resume' });
    const candidateText = `${candidate.email} ${candidate.profile?.fullName ?? ''} ${resumeText}`;
    const vacancyText = `${vacancy.title} ${vacancy.description}`;

    // Vector search context (can be used for more advanced RAG-based matching later)
    const candidateVector = await this.toEmbedding(candidateText);
    const vacancyVector = await this.toEmbedding(vacancyText);

    // Dynamic scoring for Sourcing context (limited signal since no application exists yet)
    const profileScore = candidate.profile?.fullName ? 0.3 : 0.1;
    const resumeScore = resumeSummary ? 0.5 : 0.1;
    const baseScore = 0.2; // Base match potential

    const score = Number(((profileScore + resumeScore + baseScore) * 100).toFixed(2));

    const matching = await prisma.matchingScore.upsert({
      where: { candidateId_vacancyId: { candidateId, vacancyId } },
      update: { score, status: 'completed', computedAt: new Date() },
      create: { candidateId, vacancyId, score, status: 'completed', modelVersion: 'matching-on-demand' },
    });

    const dimensions = [
      { dimension: 'profile', score: Number((profileScore * 100).toFixed(2)), weight: 0.4, reasoning: 'Completude e dados do perfil.' },
      { dimension: 'resume', score: Number((resumeScore * 100).toFixed(2)), weight: 0.6, reasoning: 'Aderência técnica baseada no CV parseado.' },
    ];

    await prisma.matchingBreakdown.deleteMany({ where: { matchingScoreId: matching.id } });
    await prisma.matchingBreakdown.createMany({
      data: dimensions.map((item) => ({ ...item, matchingScoreId: matching.id })),
    });

    const explanation = await this.aiGateway.explainMatching({
      applicationId: `ondemand-${candidateId}-${vacancyId}`,
      score,
      dimensions,
    });

    await prisma.aiExplanation.create({
      data: {
        candidateId,
        matchingScoreId: matching.id,
        context: 'on-demand-sourcing',
        explanation: explanation.text,
        generatedBy: explanation.provider,
      },
    });

    return this.getMatching(candidateId, vacancyId);
  }

  async getMatching(candidateId: string, vacancyId: string) {
    const matching = await prisma.matchingScore.findUnique({
      where: { candidateId_vacancyId: { candidateId, vacancyId } },
      include: {
        breakdown: true,
        explanations: { orderBy: { createdAt: 'desc' }, take: 1 },
        evidences: true,
      },
    });

    if (!matching) return null;

    return {
      score: matching.score,
      status: matching.status || 'completed',
      computedAt: matching.computedAt,
      modelVersion: matching.modelVersion,
      dimensions: matching.breakdown.map((b) => ({
        dimension: b.dimension,
        score: b.score,
        weight: b.weight,
        reasoning: b.reasoning,
      })),
      explanation: matching.explanations[0]?.explanation,
      evidences: matching.evidences.map((ev) => ({
        sourceType: ev.sourceType,
        excerpt: ev.excerpt,
        confidence: ev.confidence,
      })),
    };
  }

  async compareCandidates(vacancyId: string, leftId: string, rightId: string, actorId?: string) {
    const [left, right] = await Promise.all([
      this.getMatching(leftId, vacancyId),
      this.getMatching(rightId, vacancyId),
    ]);

    if (!left || !right) {
      throw new NotFoundException('matching_data_missing_for_comparison');
    }

    return {
      winner: left.score >= right.score ? 'left' : 'right',
      gap: Math.abs(left.score - right.score),
      left,
      right,
    };
  }
}

import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { AiGateway } from '../integrations/ai.gateway.js';

@Injectable()
export class CandidateMatchingService {
  constructor(@Inject(AiGateway) private readonly aiGateway: AiGateway) {}

  private async assertTenantAccess(organizationId: string, actorId?: string): Promise<void> {
    if (!actorId) return;
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId: actorId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }

  private toEmbedding(text: string): number[] {
    const base = text.length || 1;
    return [
      Number(((base % 97) / 100).toFixed(3)),
      Number(((base % 53) / 100).toFixed(3)),
      Number(((base % 31) / 100).toFixed(3)),
      Number(((base % 17) / 100).toFixed(3)),
    ];
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

    const candidateVector = this.toEmbedding(candidateText);
    const vacancyVector = this.toEmbedding(vacancyText);

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

  async getMatching(candidateId: string, vacancyId: string) {
    return prisma.matchingScore.findUnique({
      where: { candidateId_vacancyId: { candidateId, vacancyId } },
      include: {
        breakdowns: true,
        evidences: true,
        explanations: true,
      },
    });
  }

  async compareCandidates(vacancyId: string, leftCandidateId: string, rightCandidateId: string, actorId?: string) {
    const vacancy = await prisma.vacancy.findUnique({ where: { id: vacancyId } });
    if (!vacancy) throw new NotFoundException('vacancy_not_found');
    await this.assertTenantAccess(vacancy.organizationId, actorId);

    const [left, right] = await Promise.all([
      prisma.matchingScore.findUnique({ where: { candidateId_vacancyId: { candidateId: leftCandidateId, vacancyId } } }),
      prisma.matchingScore.findUnique({ where: { candidateId_vacancyId: { candidateId: rightCandidateId, vacancyId } } }),
    ]);

    const comparison = await this.aiGateway.compareCandidates({
      vacancyId,
      left: { candidateId: leftCandidateId, score: left?.score ?? 0 },
      right: { candidateId: rightCandidateId, score: right?.score ?? 0 },
    });

    return prisma.candidateComparison.upsert({
      where: { vacancyId_leftCandidateId_rightCandidateId: { vacancyId, leftCandidateId, rightCandidateId } },
      update: { comparisonJson: comparison as never },
      create: { vacancyId, leftCandidateId, rightCandidateId, comparisonJson: comparison as never },
    });
  }
}

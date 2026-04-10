import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';

@Injectable()
export class SmartInterviewService {
  async upsertTemplate(input: { vacancyId: string; configJson: Record<string, unknown>; createdBy: string }) {
    const vacancy = await prisma.vacancy.findUnique({ where: { id: input.vacancyId } });
    if (!vacancy) throw new NotFoundException('vacancy_not_found');

    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: vacancy.organizationId, userId: input.createdBy } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    return prisma.smartInterviewTemplate.upsert({
      where: { vacancyId: input.vacancyId },
      update: { configJson: input.configJson as never },
      create: { vacancyId: input.vacancyId, configJson: input.configJson as never, createdBy: input.createdBy },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async generateQuestions(templateId: string) {
    const template = await prisma.smartInterviewTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('template_not_found');

    await prisma.smartInterviewQuestion.deleteMany({ where: { templateId } });
    const prompts = [
      'Fale sobre um desafio técnico recente e como você resolveu.',
      'Explique como você prioriza demandas com prazo curto.',
      'Conte um exemplo de colaboração com times multidisciplinares.',
    ];

    await prisma.smartInterviewQuestion.createMany({
      data: prompts.map((prompt, idx) => ({
        templateId,
        orderIndex: idx + 1,
        prompt,
        maxDuration: 120,
        source: 'ai-mock',
      })),
    });

    return prisma.smartInterviewTemplate.update({
      where: { id: templateId },
      data: { status: 'ready' },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async replaceQuestions(templateId: string, questions: Array<{ orderIndex: number; prompt: string; maxDuration?: number }>) {
    const template = await prisma.smartInterviewTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('template_not_found');
    if (!questions.length) throw new BadRequestException('at_least_one_question_required');

    await prisma.$transaction([
      prisma.smartInterviewQuestion.deleteMany({ where: { templateId } }),
      prisma.smartInterviewQuestion.createMany({
        data: questions.map((question, index) => ({
          templateId,
          orderIndex: question.orderIndex || index + 1,
          prompt: question.prompt,
          maxDuration: question.maxDuration ?? 120,
          source: 'manual',
        })),
      }),
    ]);

    return prisma.smartInterviewTemplate.update({
      where: { id: templateId },
      data: { status: 'ready' },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  findTemplateByVacancy(vacancyId: string) {
    return prisma.smartInterviewTemplate.findUnique({
      where: { vacancyId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async createSession(input: { applicationId: string; createdBy: string }) {
    const application = await prisma.application.findUnique({
      where: { id: input.applicationId },
      include: { vacancy: true },
    });
    if (!application) throw new NotFoundException('application_not_found');

    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: application.vacancy.organizationId,
          userId: input.createdBy,
        },
      },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    const template = await prisma.smartInterviewTemplate.findUnique({ where: { vacancyId: application.vacancyId } });
    if (!template) throw new NotFoundException('template_not_found_for_vacancy');

    return prisma.smartInterviewSession.upsert({
      where: { applicationId: input.applicationId },
      update: { templateId: template.id, status: 'in_progress', startedAt: new Date() },
      create: {
        applicationId: input.applicationId,
        templateId: template.id,
        publicToken: `si-${randomUUID()}`,
        status: 'in_progress',
        startedAt: new Date(),
      },
      include: { template: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
    });
  }

  async getCandidateSession(publicToken: string) {
    const session = await prisma.smartInterviewSession.findUnique({
      where: { publicToken },
      include: {
        application: { include: { candidate: true, vacancy: true } },
        template: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
        answers: true,
      },
    });
    if (!session) throw new NotFoundException('session_not_found');
    return session;
  }

  async createPresignedUpload(input: { sessionId: string; questionId: string; publicToken: string }) {
    const session = await this.getCandidateAuthorizedSession(input.sessionId, input.publicToken);

    const objectKey = `smart-interview/${session.applicationId}/${input.questionId}/${randomUUID()}.webm`;
    return {
      objectKey,
      method: 'PUT',
      expiresIn: 900,
      url: `https://mock-storage.local/upload/${encodeURIComponent(objectKey)}`,
      headers: { 'x-mock-signature': 'enabled' },
    };
  }

  async completeAnswer(input: { sessionId: string; questionId: string; objectKey: string; durationSec?: number; publicToken: string }) {
    const session = await this.getCandidateAuthorizedSession(input.sessionId, input.publicToken);

    const answer = await prisma.smartInterviewAnswer.upsert({
      where: { sessionId_questionId: { sessionId: input.sessionId, questionId: input.questionId } },
      update: { objectKey: input.objectKey, durationSec: input.durationSec, status: 'uploaded' },
      create: {
        sessionId: input.sessionId,
        questionId: input.questionId,
        candidateId: session.application.candidateId,
        objectKey: input.objectKey,
        provider: 'mock-s3',
        durationSec: input.durationSec,
        status: 'uploaded',
      },
    });

    await prisma.outboxEvent.create({
      data: { topic: 'smart-interview.video-uploaded', payload: { answerId: answer.id, sessionId: input.sessionId } },
    });

    return answer;
  }

  async submitSession(input: { sessionId: string; publicToken: string }) {
    const session = await prisma.smartInterviewSession.findUnique({
      where: { id: input.sessionId },
      include: { answers: true },
    });
    if (!session) throw new NotFoundException('session_not_found');
    if (session.publicToken !== input.publicToken) throw new ForbiddenException('invalid_public_token');
    if (!session.answers.length) throw new BadRequestException('no_answers_uploaded');

    return prisma.smartInterviewSession.update({
      where: { id: input.sessionId },
      data: { status: 'submitted', submittedAt: new Date() },
    });
  }

  private async getCandidateAuthorizedSession(sessionId: string, publicToken: string) {
    const session = await prisma.smartInterviewSession.findUnique({
      where: { id: sessionId },
      include: { application: true },
    });
    if (!session) throw new NotFoundException('session_not_found');
    if (session.publicToken !== publicToken) throw new ForbiddenException('invalid_public_token');
    return session;
  }

  getReviewSession(sessionId: string) {
    return prisma.smartInterviewSession.findUnique({
      where: { id: sessionId },
      include: {
        application: { include: { candidate: true, vacancy: true } },
        template: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
        answers: { include: { transcript: true, question: true }, orderBy: { uploadedAt: 'asc' } },
        aiAnalysis: true,
        humanReview: true,
      },
    });
  }

  async submitHumanReview(input: { sessionId: string; reviewerId: string; decision: string; notes: string }) {
    const session = await prisma.smartInterviewSession.findUnique({ where: { id: input.sessionId } });
    if (!session) throw new NotFoundException('session_not_found');

    const review = await prisma.smartInterviewHumanReview.upsert({
      where: { sessionId: input.sessionId },
      update: { reviewerId: input.reviewerId, decision: input.decision, notes: input.notes },
      create: { sessionId: input.sessionId, reviewerId: input.reviewerId, decision: input.decision, notes: input.notes },
    });

    await prisma.smartInterviewSession.update({
      where: { id: input.sessionId },
      data: { status: 'reviewed', reviewedAt: new Date() },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: input.reviewerId,
        action: 'smart_interview.reviewed',
        entityType: 'SmartInterviewSession',
        entityId: input.sessionId,
        metadata: { decision: input.decision },
      },
    });

    return review;
  }
}

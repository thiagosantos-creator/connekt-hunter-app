import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import { AiGateway } from '../integrations/ai.gateway.js';
import { StorageGateway } from '../integrations/storage.gateway.js';
import { TranscriptionGateway } from '../integrations/transcription.gateway.js';

@Injectable()
export class SmartInterviewService {
  private readonly logger = new Logger(SmartInterviewService.name);

  constructor(
    private readonly aiGateway: AiGateway,
    private readonly storageGateway: StorageGateway,
    private readonly transcriptionGateway: TranscriptionGateway,
  ) {}

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

    const generated = await this.aiGateway.generateInterviewQuestions({
      templateId,
      context: template.configJson as Record<string, unknown>,
    });

    await prisma.smartInterviewQuestion.deleteMany({ where: { templateId } });
    await prisma.smartInterviewQuestion.createMany({
      data: generated.questions.map((prompt, idx) => ({
        templateId,
        orderIndex: idx + 1,
        prompt,
        maxDuration: 120,
        source: generated.provider,
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

  async createSession(input: { applicationId: string }) {
    const application = await prisma.application.findUnique({
      where: { id: input.applicationId },
      include: { vacancy: true },
    });
    if (!application) throw new NotFoundException('application_not_found');

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

  async createPresignedUpload(input: { sessionId: string; questionId: string }) {
    const session = await prisma.smartInterviewSession.findUnique({
      where: { id: input.sessionId },
      include: {
        application: { include: { vacancy: true } },
        template: { include: { questions: true } },
      },
    });
    if (!session) throw new NotFoundException('session_not_found');
    if (session.status !== 'in_progress') throw new UnprocessableEntityException('session_not_accepting_answers');

    const questionExists = session.template.questions.some((question) => question.id === input.questionId);
    if (!questionExists) throw new BadRequestException('question_not_in_template');

    return this.storageGateway.createPresignedUpload({
      tenantId: session.application.vacancy.organizationId,
      namespace: `smart-interview/${session.applicationId}/${input.questionId}`,
      filename: 'answer.webm',
      metadata: { questionId: input.questionId, sessionId: input.sessionId },
    });
  }

  async completeAnswer(input: { sessionId: string; questionId: string; objectKey: string; durationSec?: number }) {
    const session = await prisma.smartInterviewSession.findUnique({
      where: { id: input.sessionId },
      include: {
        application: { include: { vacancy: true } },
        template: { include: { questions: true } },
      },
    });
    if (!session) throw new NotFoundException('session_not_found');
    if (session.status !== 'in_progress') throw new UnprocessableEntityException('session_not_accepting_answers');

    const questionExists = session.template.questions.some((question) => question.id === input.questionId);
    if (!questionExists) throw new BadRequestException('question_not_in_template');

    const answer = await prisma.smartInterviewAnswer.upsert({
      where: { sessionId_questionId: { sessionId: input.sessionId, questionId: input.questionId } },
      update: { objectKey: input.objectKey, durationSec: input.durationSec, status: 'uploaded' },
      create: {
        sessionId: input.sessionId,
        questionId: input.questionId,
        candidateId: session.application.candidateId,
        objectKey: input.objectKey,
        provider: 'storage-gateway',
        durationSec: input.durationSec,
        status: 'uploaded',
      },
    });

    await this.transcriptionGateway.enqueue({
      answerId: answer.id,
      objectKey: answer.objectKey,
      tenantId: session.application.vacancy.organizationId,
    });

    await prisma.outboxEvent.create({
      data: { topic: 'smart-interview.video-uploaded', payload: { answerId: answer.id, sessionId: input.sessionId } },
    });

    this.logger.log(
      JSON.stringify({
        event: 'smart_interview_answer_uploaded',
        sessionId: input.sessionId,
        questionId: input.questionId,
        answerId: answer.id,
      }),
    );

    return answer;
  }

  async submitSession(sessionId: string) {
    const session = await prisma.smartInterviewSession.findUnique({
      where: { id: sessionId },
      include: { answers: { include: { transcript: true } } },
    });
    if (!session) throw new NotFoundException('session_not_found');
    if (session.status !== 'in_progress') throw new UnprocessableEntityException('session_not_submittable');
    if (!session.answers.length) throw new BadRequestException('no_answers_uploaded');

    const transcriptText = session.answers.map((answer) => answer.transcript?.content ?? '').join('\n').trim();
    const aiResult = await this.aiGateway.analyzeInterview({ sessionId, transcript: transcriptText || 'transcript pending' });

    await prisma.smartInterviewAiAnalysis.upsert({
      where: { sessionId },
      update: {
        status: 'completed',
        summary: aiResult.summary,
        highlights: aiResult.highlights as never,
        risks: aiResult.risks as never,
      },
      create: {
        sessionId,
        status: 'completed',
        summary: aiResult.summary,
        highlights: aiResult.highlights as never,
        risks: aiResult.risks as never,
      },
    });

    return prisma.smartInterviewSession.update({
      where: { id: sessionId },
      data: { status: 'submitted', submittedAt: new Date() },
    });
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
    if (session.status !== 'submitted') throw new UnprocessableEntityException('session_not_ready_for_human_review');
    if (!input.notes?.trim()) throw new BadRequestException('review_notes_required');

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

import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class OnboardingService {
  async basic(token: string, fullName: string, phone: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
    await prisma.candidateProfile.upsert({
      where: { candidateId: candidate.id },
      update: { fullName, phone },
      create: { candidateId: candidate.id, fullName, phone },
    });
    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      data: { basicCompleted: true },
    });
    return { ok: true };
  }

  async consent(token: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
    const session = await prisma.candidateOnboardingSession.findUniqueOrThrow({
      where: { candidateId: candidate.id },
    });
    await prisma.candidateConsent.createMany({
      data: [
        { sessionId: session.id, type: 'lgpd', accepted: true },
        { sessionId: session.id, type: 'terms', accepted: true },
      ],
    });
    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      data: { consentCompleted: true },
    });
    return { ok: true };
  }

  async resume(token: string, filename: string) {
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { token } });
    const session = await prisma.candidateOnboardingSession.findUniqueOrThrow({
      where: { candidateId: candidate.id },
    });
    const resume = await prisma.candidateResume.create({
      data: { sessionId: session.id, objectKey: `cv/${candidate.id}/${filename}`, provider: 'minio' },
    });
    await prisma.outboxEvent.create({ data: { topic: 'resume.uploaded', payload: { resumeId: resume.id } } });
    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      data: { resumeCompleted: true, status: 'completed' },
    });
    return resume;
  }
}

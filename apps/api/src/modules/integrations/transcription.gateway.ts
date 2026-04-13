import { Inject, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { IntegrationsConfigService } from './integrations-config.service.js';

@Injectable()
export class TranscriptionGateway {
  constructor(@Inject(IntegrationsConfigService) private readonly config: IntegrationsConfigService) {}

  async enqueue(input: { answerId: string; objectKey: string; tenantId: string }) {
    const provider = this.config.isIntegrationEnabled('transcription') ? 'transcription-real' : 'transcription-mock';

    return prisma.transcriptMetadata.upsert({
      where: { answerId: input.answerId },
      update: { provider, status: 'queued', retries: 0, lastError: null },
      create: {
        answerId: input.answerId,
        provider,
        status: 'queued',
        retries: 0,
      },
    });
  }

  async complete(input: { answerId: string; transcript: string; language?: string }) {
    await prisma.transcriptMetadata.update({
      where: { answerId: input.answerId },
      data: { status: 'completed', processedAt: new Date() },
    });

    return prisma.smartInterviewTranscript.upsert({
      where: { answerId: input.answerId },
      update: { content: input.transcript, status: 'completed', language: input.language ?? 'pt-BR' },
      create: { answerId: input.answerId, content: input.transcript, status: 'completed', language: input.language ?? 'pt-BR' },
    });
  }
}

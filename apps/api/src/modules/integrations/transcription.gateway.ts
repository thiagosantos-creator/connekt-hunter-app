import { Inject, Injectable, Logger } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { IntegrationsConfigService } from './integrations-config.service.js';
import { AwsTranscribeProvider } from './aws-transcribe.provider.js';

@Injectable()
export class TranscriptionGateway {
  private readonly logger = new Logger(TranscriptionGateway.name);

  constructor(
    @Inject(IntegrationsConfigService) private readonly config: IntegrationsConfigService,
    private readonly transcribe: AwsTranscribeProvider,
  ) {}

  private get isReal(): boolean {
    return this.config.isIntegrationEnabled('transcription');
  }

  async enqueue(input: { answerId: string; objectKey: string; tenantId: string }) {
    const provider = this.isReal ? 'transcription-real' : 'transcription-mock';

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

  async transcribeFromS3(input: {
    answerId: string;
    objectKey: string;
    tenantId: string;
    languageCode?: string;
  }): Promise<{ transcript: string; language: string; provider: string }> {
    if (!this.isReal) {
      this.logger.log(JSON.stringify({ event: 'transcription_mock', answerId: input.answerId }));
      return {
        transcript: 'Transcrição mock gerada pelo worker.',
        language: 'pt-BR',
        provider: 'transcription-mock',
      };
    }

    const bucket = process.env.S3_BUCKET ?? 'connekt-staging-assets';
    const region = process.env.S3_REGION ?? 'us-east-1';
    const mediaUri = `s3://${bucket}/${input.objectKey}`;
    const jobName = `connekt-${input.answerId}-${Date.now()}`;

    try {
      await this.transcribe.startTranscriptionJob({
        jobName,
        mediaUri,
        languageCode: input.languageCode ?? 'pt-BR',
        outputBucket: bucket,
        outputKey: `transcriptions/${input.tenantId}/${input.answerId}.json`,
      });

      const result = await this.transcribe.pollUntilComplete(jobName);

      if (result.status === 'COMPLETED' && result.transcript) {
        await prisma.transcriptMetadata.update({
          where: { answerId: input.answerId },
          data: { status: 'completed', processedAt: new Date() },
        });

        this.logger.log(
          JSON.stringify({
            event: 'transcription_real_completed',
            answerId: input.answerId,
            jobName,
            language: result.languageCode,
            transcriptLength: result.transcript.length,
          }),
        );

        return {
          transcript: result.transcript,
          language: result.languageCode ?? 'pt-BR',
          provider: 'aws-transcribe',
        };
      }

      throw new Error(`Transcription job failed: ${result.error ?? result.status}`);
    } catch (err) {
      this.logger.warn(JSON.stringify({ event: 'transcription_real_failed', answerId: input.answerId, error: String(err) }));

      await prisma.transcriptMetadata.update({
        where: { answerId: input.answerId },
        data: { status: 'error', retries: { increment: 1 }, lastError: String(err) },
      });

      if (this.config.shouldFallbackToMock('transcription')) {
        this.logger.log(JSON.stringify({ event: 'transcription_fallback_to_mock', answerId: input.answerId }));
        return {
          transcript: 'Transcrição mock (fallback após falha no provedor real).',
          language: 'pt-BR',
          provider: 'transcription-mock',
        };
      }
      throw err;
    }
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

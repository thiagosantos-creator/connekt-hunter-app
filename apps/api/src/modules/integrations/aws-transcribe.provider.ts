import { Injectable, Logger } from '@nestjs/common';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  type TranscriptionJob,
  type LanguageCode as TranscribeLanguageCode,
} from '@aws-sdk/client-transcribe';

export interface TranscribeJobResult {
  jobName: string;
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS' | 'QUEUED';
  transcriptUri?: string;
  transcript?: string;
  languageCode?: string;
  error?: string;
}

@Injectable()
export class AwsTranscribeProvider {
  private readonly logger = new Logger(AwsTranscribeProvider.name);
  private readonly client: TranscribeClient;

  constructor() {
    this.client = new TranscribeClient({
      region: process.env.AWS_TRANSCRIBE_REGION ?? process.env.S3_REGION ?? 'us-east-1',
    });
  }

  async startTranscriptionJob(input: {
    jobName: string;
    mediaUri: string;
    languageCode?: string;
    outputBucket?: string;
    outputKey?: string;
  }): Promise<TranscribeJobResult> {
    const languageCode = (input.languageCode ?? 'pt-BR') as TranscribeLanguageCode;

    const command = new StartTranscriptionJobCommand({
      TranscriptionJobName: input.jobName,
      LanguageCode: languageCode,
      MediaFormat: 'webm',
      Media: { MediaFileUri: input.mediaUri },
      OutputBucketName: input.outputBucket ?? process.env.S3_BUCKET,
      OutputKey: input.outputKey ?? `transcriptions/${input.jobName}.json`,
      Settings: {
        ShowSpeakerLabels: false,
        ChannelIdentification: false,
      },
    });

    const response = await this.client.send(command);
    const job = response.TranscriptionJob;

    this.logger.log(
      JSON.stringify({
        event: 'transcribe_job_started',
        jobName: input.jobName,
        status: job?.TranscriptionJobStatus,
        languageCode,
      }),
    );

    return {
      jobName: input.jobName,
      status: this.mapStatus(job),
      languageCode,
    };
  }

  async getTranscriptionJob(jobName: string): Promise<TranscribeJobResult> {
    const command = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName,
    });

    const response = await this.client.send(command);
    const job = response.TranscriptionJob;
    const status = this.mapStatus(job);

    const result: TranscribeJobResult = { jobName, status };

    if (status === 'COMPLETED' && job?.Transcript?.TranscriptFileUri) {
      result.transcriptUri = job.Transcript.TranscriptFileUri;
      result.languageCode = job.LanguageCode;

      try {
        const transcriptResponse = await fetch(job.Transcript.TranscriptFileUri);
        const transcriptData = (await transcriptResponse.json()) as {
          results?: { transcripts?: Array<{ transcript?: string }> };
        };
        result.transcript =
          transcriptData.results?.transcripts?.map((t) => t.transcript).join(' ') ?? '';
      } catch (err) {
        this.logger.warn(
          JSON.stringify({
            event: 'transcribe_fetch_transcript_failed',
            jobName,
            error: String(err),
          }),
        );
      }
    }

    if (status === 'FAILED') {
      result.error = job?.FailureReason ?? 'unknown_failure';
    }

    return result;
  }

  async pollUntilComplete(
    jobName: string,
    maxAttempts = 60,
    intervalMs = 5000,
  ): Promise<TranscribeJobResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.getTranscriptionJob(jobName);
      if (result.status === 'COMPLETED' || result.status === 'FAILED') {
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return { jobName, status: 'FAILED', error: 'polling_timeout' };
  }

  private mapStatus(
    job?: TranscriptionJob,
  ): 'COMPLETED' | 'FAILED' | 'IN_PROGRESS' | 'QUEUED' {
    switch (job?.TranscriptionJobStatus) {
      case 'COMPLETED':
        return 'COMPLETED';
      case 'FAILED':
        return 'FAILED';
      case 'IN_PROGRESS':
        return 'IN_PROGRESS';
      default:
        return 'QUEUED';
    }
  }
}

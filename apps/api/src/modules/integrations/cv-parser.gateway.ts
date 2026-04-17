import { Inject, Injectable, Logger } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { IntegrationsConfigService } from './integrations-config.service.js';
import { OpenAiProvider } from './openai.provider.js';

@Injectable()
export class CvParserGateway {
  private readonly logger = new Logger(CvParserGateway.name);

  constructor(
    @Inject(IntegrationsConfigService) private readonly config: IntegrationsConfigService,
    private readonly openai: OpenAiProvider,
  ) {}

  async parseResume(input: { resumeId: string; objectKey: string; candidateId: string; resumeText?: string }) {
    const isReal = this.config.isIntegrationEnabled('cv-parser');
    let provider = isReal ? 'cv-parser-real' : 'cv-parser-mock';
    let parsed: Record<string, unknown>;

    if (isReal) {
      try {
        if (!input.resumeText?.trim()) {
          this.logger.warn('CV Parse skipped: empty text');
          throw new Error('resume_text_required_for_real_cv_parser');
        }

        const snippet = input.resumeText.slice(0, 100).replace(/\n/g, ' ');
        this.logger.log(`Starting real CV parse for candidate ${input.candidateId} (text length: ${input.resumeText.length}). Snippet: "${snippet}..."`);

        const result = await this.openai.parseResume({
          resumeText: input.resumeText,
          objectKey: input.objectKey,
          candidateId: input.candidateId,
        });
        parsed = {
          ...result,
          metadata: { provider: 'openai-cv-parser', objectKey: input.objectKey },
        };
        provider = 'cv-parser-real';

        this.logger.log(
          JSON.stringify({
            event: 'cv_parse_real_completed',
            candidateId: input.candidateId,
            resumeId: input.resumeId,
            experienceCount: result.experience.length,
            skillsCount: result.skills.length,
          }),
        );
      } catch (err) {
        const errorDetails = err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
        this.logger.warn(JSON.stringify({ 
          event: 'cv_parse_real_failed', 
          resumeId: input.resumeId, 
          candidateId: input.candidateId,
          error: errorDetails 
        }));

        if (this.config.shouldFallbackToMock('cv-parser')) {
          this.logger.log(`Falling back to mock CV parse for resume ${input.resumeId}`);
          parsed = this.getMockParsed(provider, input.objectKey);
          provider = 'cv-parser-mock';
        } else {
          throw err;
        }
      }
    } else {
      this.logger.log(`Mock CV parse triggered for resume ${input.resumeId}`);
      parsed = this.getMockParsed(provider, input.objectKey);
    }

    await prisma.resumeParseMetadata.upsert({
      where: { resumeId: input.resumeId },
      update: { provider, status: 'parsed', confidenceJson: parsed as never, mergedAt: null },
      create: { resumeId: input.resumeId, provider, status: 'parsed', confidenceJson: parsed as never },
    });

    return parsed;
  }

  private getMockParsed(provider: string, objectKey: string) {
    return {
      experience: [{ company: 'Empresa Exemplo', role: 'Software Engineer', confidence: 0.78 }],
      education: [{ institution: 'Universidade Exemplo', degree: 'BSc', confidence: 0.74 }],
      skills: [{ name: 'TypeScript', confidence: 0.88 }],
      languages: [{ name: 'Português', level: 'Nativo', confidence: 0.9 }],
      location: { city: 'São Paulo', confidence: 0.66 },
      metadata: { provider, objectKey },
    };
  }
}

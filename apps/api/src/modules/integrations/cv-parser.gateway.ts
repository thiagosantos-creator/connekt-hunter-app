import { Inject, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { IntegrationsConfigService } from './integrations-config.service.js';

@Injectable()
export class CvParserGateway {
  constructor(@Inject(IntegrationsConfigService) private readonly config: IntegrationsConfigService) {}

  async parseResume(input: { resumeId: string; objectKey: string; candidateId: string }) {
    const provider = this.config.isIntegrationEnabled('cv-parser') ? 'cv-parser-real' : 'cv-parser-mock';
    const parsed = {
      experience: [{ company: 'Empresa Exemplo', role: 'Software Engineer', confidence: 0.78 }],
      education: [{ institution: 'Universidade Exemplo', degree: 'BSc', confidence: 0.74 }],
      skills: [{ name: 'TypeScript', confidence: 0.88 }],
      languages: [{ name: 'Português', level: 'Nativo', confidence: 0.9 }],
      location: { city: 'São Paulo', confidence: 0.66 },
      metadata: { provider, objectKey: input.objectKey },
    };

    await prisma.resumeParseMetadata.upsert({
      where: { resumeId: input.resumeId },
      update: { provider, status: 'parsed', confidenceJson: parsed as never, mergedAt: null },
      create: { resumeId: input.resumeId, provider, status: 'parsed', confidenceJson: parsed as never },
    });

    return parsed;
  }
}

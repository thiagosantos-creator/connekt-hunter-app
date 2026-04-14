import { Global, Module } from '@nestjs/common';
import { IntegrationsConfigService } from './integrations-config.service.js';
import { ProviderRegistryService } from './provider-registry.service.js';
import { StorageGateway } from './storage.gateway.js';
import { EmailGateway } from './email.gateway.js';
import { AiGateway } from './ai.gateway.js';
import { CvParserGateway } from './cv-parser.gateway.js';
import { TranscriptionGateway } from './transcription.gateway.js';
import { IntegrationsHealthService } from './integrations-health.service.js';
import { OpenAiProvider } from './openai.provider.js';
import { AwsTranscribeProvider } from './aws-transcribe.provider.js';
import { AwsComprehendProvider } from './aws-comprehend.provider.js';

@Global()
@Module({
  providers: [
    IntegrationsConfigService,
    ProviderRegistryService,
    IntegrationsHealthService,
    OpenAiProvider,
    AwsTranscribeProvider,
    AwsComprehendProvider,
    StorageGateway,
    EmailGateway,
    AiGateway,
    CvParserGateway,
    TranscriptionGateway,
  ],
  exports: [
    IntegrationsConfigService,
    ProviderRegistryService,
    IntegrationsHealthService,
    OpenAiProvider,
    AwsTranscribeProvider,
    AwsComprehendProvider,
    StorageGateway,
    EmailGateway,
    AiGateway,
    CvParserGateway,
    TranscriptionGateway,
  ],
})
export class IntegrationsModule {}

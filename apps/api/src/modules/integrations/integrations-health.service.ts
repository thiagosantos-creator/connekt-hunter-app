import { Injectable } from '@nestjs/common';
import { IntegrationsConfigService } from './integrations-config.service.js';

@Injectable()
export class IntegrationsHealthService {
  constructor(private readonly config: IntegrationsConfigService) {}

  async health() {
    return {
      environment: this.config.environment,
      integrations: {
        storage: this.config.isIntegrationEnabled('storage') ? 'aws-s3' : 'minio',
        email: this.config.isIntegrationEnabled('email') ? 'aws-ses' : 'mailhog',
        auth: this.config.isIntegrationEnabled('auth') ? 'aws-cognito' : 'dev-auth',
        ai: this.config.isIntegrationEnabled('ai') ? 'ai-real' : 'ai-mock',
        cvParser: this.config.isIntegrationEnabled('cv-parser') ? 'cv-parser-real' : 'cv-parser-mock',
        transcription: this.config.isIntegrationEnabled('transcription') ? 'transcription-real' : 'transcription-mock',
      },
    };
  }
}

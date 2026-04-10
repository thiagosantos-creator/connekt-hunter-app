export type IntegrationKey =
  | 'storage'
  | 'email'
  | 'auth'
  | 'ai'
  | 'cv-parser'
  | 'transcription';

export type IntegrationProviderName =
  | 'minio'
  | 'aws-s3'
  | 'mailhog'
  | 'aws-ses'
  | 'dev-auth'
  | 'aws-cognito'
  | 'ai-mock'
  | 'ai-real'
  | 'cv-parser-mock'
  | 'cv-parser-real'
  | 'transcription-mock'
  | 'transcription-real';

export type ProviderHealthStatus = 'up' | 'degraded' | 'down';

export interface ProviderHealth {
  status: ProviderHealthStatus;
  provider: IntegrationProviderName;
  details?: Record<string, unknown>;
}

export interface IntegrationProvider {
  readonly integration: IntegrationKey;
  readonly name: IntegrationProviderName;
  readonly mode: 'mock' | 'real';
  readonly isAvailable: boolean;
  healthcheck(): Promise<ProviderHealth>;
}

export const servicePorts = {
  api: 3001,
  worker: 3010,
  backofficeWeb: 3000,
  candidateWeb: 3002,
  postgres: 5432,
  redis: 6379,
  minio: 9000,
  mailhogSmtp: 1025,
  mailhogHttp: 8025,
} as const;

export const envExampleFiles = [
  'infra/env/.env.example',
  'infra/env/.env.api.example',
  'infra/env/.env.web.example',
] as const;

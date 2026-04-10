import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import { IntegrationsConfigService } from './integrations-config.service.js';

export interface PresignedUpload {
  objectKey: string;
  url: string;
  method: 'PUT';
  expiresIn: number;
  headers: Record<string, string>;
  provider: string;
}

@Injectable()
export class StorageGateway {
  constructor(private readonly config: IntegrationsConfigService) {}

  async createPresignedUpload(input: { tenantId: string; namespace: string; filename: string; metadata?: Record<string, unknown> }): Promise<PresignedUpload> {
    const provider = this.config.isIntegrationEnabled('storage') ? 'aws-s3' : 'minio';
    const objectKey = `${input.tenantId}/${input.namespace}/${randomUUID()}-${input.filename}`;

    await prisma.providerExecutionLog.create({
      data: {
        integration: 'storage',
        provider,
        operation: 'create-presigned-upload',
        status: 'success',
        idempotencyKey: objectKey,
        requestJson: input as never,
        responseJson: { objectKey } as never,
      },
    });

    return {
      provider,
      objectKey,
      method: 'PUT',
      expiresIn: 900,
      url: provider === 'aws-s3' ? `https://s3.amazonaws.com/mock-bucket/${encodeURIComponent(objectKey)}` : `https://minio.local/${encodeURIComponent(objectKey)}`,
      headers: { 'x-upload-provider': provider, 'x-tenant-id': input.tenantId },
    };
  }

  async recordAsset(input: { tenantId: string; objectKey: string; category: string; provider?: string; metadata?: Record<string, unknown> }) {
    return prisma.storageAssetMetadata.create({
      data: {
        tenantId: input.tenantId,
        objectKey: input.objectKey,
        category: input.category,
        provider: input.provider ?? (this.config.isIntegrationEnabled('storage') ? 'aws-s3' : 'minio'),
        metadata: (input.metadata ?? {}) as never,
      },
    });
  }
}

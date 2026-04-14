import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock, getSignedUrlMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  getSignedUrlMock: vi.fn(),
}));

vi.mock('@connekt/db', () => ({
  prisma: {
    providerExecutionLog: { create: vi.fn().mockResolvedValue({}) },
    storageAssetMetadata: { create: vi.fn().mockResolvedValue({ id: 'asset-1' }) },
  },
}));

vi.mock('@aws-sdk/client-s3', () => {
  class S3ServiceException extends Error {}
  class S3Client {
    send = sendMock;
  }
  class PutObjectCommand {
    constructor(readonly input: unknown) {}
  }
  class GetObjectCommand {
    constructor(readonly input: unknown) {}
  }
  class HeadBucketCommand {
    constructor(readonly input: unknown) {}
  }
  class CreateBucketCommand {
    constructor(readonly input: unknown) {}
  }
  return {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand,
    S3ServiceException,
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: getSignedUrlMock,
}));

import { StorageGateway } from './storage.gateway.js';
import { prisma } from '@connekt/db';

describe('StorageGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({});
    getSignedUrlMock.mockResolvedValue('https://signed-upload-url');
  });

  it('creates a real presigned upload url and logs the execution', async () => {
    const service = new StorageGateway({
      isIntegrationEnabled: () => true,
    } as never);

    const result = await service.createPresignedUpload({
      tenantId: 'org-1',
      namespace: 'candidate-cv/c1',
      filename: 'resume.pdf',
    });

    expect(result).toEqual(expect.objectContaining({
      provider: 'aws-s3',
      method: 'PUT',
      url: 'https://signed-upload-url',
      headers: { 'Content-Type': 'application/pdf' },
    }));
    expect(prisma.providerExecutionLog.create).toHaveBeenCalledOnce();
  });

  it('loads object content from storage', async () => {
    sendMock.mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Body: {
          transformToByteArray: vi.fn().mockResolvedValue(Uint8Array.from(Buffer.from('hello world', 'utf-8'))),
        },
      });

    const service = new StorageGateway({
      isIntegrationEnabled: () => true,
    } as never);

    await service.createPresignedUpload({
      tenantId: 'org-1',
      namespace: 'candidate-cv/c1',
      filename: 'resume.txt',
    });

    const buffer = await service.getObjectBuffer('org-1/file.txt');
    expect(buffer.toString('utf-8')).toBe('hello world');
  });
});

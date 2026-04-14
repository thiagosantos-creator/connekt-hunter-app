import { Inject, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
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
  private readonly bucket = process.env.S3_BUCKET ?? 'connekt-staging-assets';
  private readonly region = process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
  private readonly endpoint = process.env.S3_ENDPOINT;
  /** Public-facing endpoint used in presigned URLs returned to browsers.
   *  When running in Docker, the internal endpoint (e.g. http://minio:9000) is
   *  unreachable from the browser. Set S3_PUBLIC_ENDPOINT=http://localhost:9000
   *  so browsers can upload directly to MinIO. Defaults to S3_ENDPOINT. */
  private readonly publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT;
  private readonly s3: S3Client;
  private bucketReady = false;

  constructor(@Inject(IntegrationsConfigService) private readonly config: IntegrationsConfigService) {
    this.s3 = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || Boolean(this.endpoint),
    });
  }

  /** Rewrites an internally-generated presigned URL to use the public endpoint.
   *  This is a no-op when there is no internal/public endpoint mismatch. */
  private toPublicUrl(internalUrl: string): string {
    if (!this.publicEndpoint || !this.endpoint || this.publicEndpoint === this.endpoint) {
      return internalUrl;
    }
    try {
      const parsed = new URL(internalUrl);
      const pub = new URL(this.publicEndpoint);
      parsed.protocol = pub.protocol;
      parsed.hostname = pub.hostname;
      parsed.port = pub.port;
      return parsed.toString();
    } catch {
      // If the URL cannot be parsed (e.g. relative or malformed), return it unchanged.
      // This is safe because the presigned URL will still work from the server side;
      // only the browser upload may fail, which the caller handles with a user-facing error.
      return internalUrl;
    }
  }

  async createPresignedUpload(input: {
    tenantId: string;
    namespace: string;
    filename: string;
    contentType?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PresignedUpload> {
    const provider = this.config.isIntegrationEnabled('storage') ? 'aws-s3' : 'minio';
    const safeFilename = this.sanitizeFilename(input.filename);
    const objectKey = `${input.tenantId}/${input.namespace}/${randomUUID()}-${safeFilename}`;
    const contentType = input.contentType ?? this.detectContentType(safeFilename);

    await this.ensureBucket();

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
      Metadata: {
        tenantId: input.tenantId,
        namespace: input.namespace,
      },
    });

    const internalUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    const url = this.toPublicUrl(internalUrl);

    await prisma.providerExecutionLog.create({
      data: {
        integration: 'storage',
        provider,
        operation: 'create-presigned-upload',
        status: 'success',
        idempotencyKey: objectKey,
        requestJson: input as never,
        responseJson: { objectKey, bucket: this.bucket, expiresIn: 900, contentType } as never,
      },
    });

    return {
      provider,
      objectKey,
      method: 'PUT',
      expiresIn: 900,
      url,
      headers: { 'Content-Type': contentType },
    };
  }

  async getObjectBuffer(objectKey: string): Promise<Buffer> {
    const response = await this.s3.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    }));
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) {
      throw new Error(`storage_object_empty:${objectKey}`);
    }
    return Buffer.from(bytes);
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

  private async ensureBucket() {
    if (this.bucketReady) return;

    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      await this.ensureBucketCors();
      this.bucketReady = true;
      return;
    } catch (error) {
      const code = this.getS3ErrorCode(error);
      const canCreate = code === 'NotFound' || code === 'NoSuchBucket' || code === '404';
      if (!canCreate) {
        throw error;
      }
    }

    try {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      await this.ensureBucketCors();
      this.bucketReady = true;
    } catch (error) {
      const code = this.getS3ErrorCode(error);
      if (code === 'BucketAlreadyOwnedByYou' || code === 'BucketAlreadyExists') {
        this.bucketReady = true;
        return;
      }
      throw error;
    }
  }

  private async ensureBucketCors() {
    const allowedOrigins = this.getAllowedOrigins();
    if (allowedOrigins.length === 0) return;

    await this.s3.send(new PutBucketCorsCommand({
      Bucket: this.bucket,
      CORSConfiguration: {
        CORSRules: [{
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST'],
          AllowedOrigins: allowedOrigins,
          ExposeHeaders: ['ETag', 'x-amz-request-id', 'x-amz-id-2'],
          MaxAgeSeconds: 3000,
        }],
      },
    }));
  }

  private getAllowedOrigins() {
    const configured = process.env.S3_ALLOWED_ORIGINS
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (configured?.length) return configured;

    return [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ];
  }

  private getS3ErrorCode(error: unknown) {
    if (error instanceof S3ServiceException) {
      return error.name;
    }
    if (error && typeof error === 'object' && 'name' in error) {
      return String((error as { name: unknown }).name);
    }
    return '';
  }

  private sanitizeFilename(filename: string) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  }

  private detectContentType(filename: string) {
    const extension = extname(filename).toLowerCase();
    if (extension === '.pdf') return 'application/pdf';
    if (extension === '.doc') return 'application/msword';
    if (extension === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (extension === '.txt') return 'text/plain; charset=utf-8';
    if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
    if (extension === '.png') return 'image/png';
    if (extension === '.webp') return 'image/webp';
    if (extension === '.gif') return 'image/gif';
    return 'application/octet-stream';
  }
}

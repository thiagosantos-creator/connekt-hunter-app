import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { StorageGateway } from '../integrations/storage.gateway.js';

@Injectable()
export class CandidateProfileService {
  private readonly logger = new Logger(CandidateProfileService.name);

  constructor(private readonly storageGateway: StorageGateway) {}

  /** Generate a presigned S3 URL for uploading a profile photo */
  async createPhotoUpload(token: string, filename: string, contentType?: string) {
    const candidate = await prisma.candidate.findUnique({ where: { token } });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    const sanitized = this.sanitizeImageFilename(filename);

    const upload = await this.storageGateway.createPresignedUpload({
      tenantId: candidate.organizationId,
      namespace: `candidate-photo/${candidate.id}`,
      filename: sanitized,
      contentType: contentType ?? this.detectImageContentType(sanitized),
      metadata: { source: 'candidate-profile-photo' },
    });

    await this.storageGateway.recordAsset({
      tenantId: candidate.organizationId,
      objectKey: upload.objectKey,
      category: 'profile-photo',
      provider: upload.provider,
      metadata: { candidateId: candidate.id, filename: sanitized, status: 'pending_upload' },
    });

    this.logger.log(
      JSON.stringify({ event: 'candidate_photo_upload_created', candidateId: candidate.id }),
    );

    return {
      objectKey: upload.objectKey,
      upload: { url: upload.url, method: upload.method, headers: upload.headers },
    };
  }

  /** Confirm the upload and persist the public URL in CandidateProfile */
  async confirmPhotoUpload(token: string, objectKey: string) {
    const candidate = await prisma.candidate.findUnique({ where: { token } });
    if (!candidate) throw new NotFoundException('candidate_not_found');

    // Build a stable public URL (presigned URLs expire; store the object key
    // and generate signed URL on demand, or use a CDN origin here)
    const photoUrl = `${this.storageGateway.getPublicAssetBaseUrl()}/${objectKey}`;

    const profile = await prisma.candidateProfile.upsert({
      where: { candidateId: candidate.id },
      update: { photoUrl, photoProvider: 'upload' },
      create: {
        candidateId: candidate.id,
        photoUrl,
        photoProvider: 'upload',
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: candidate.id,
        action: 'candidate.profile_photo_updated',
        entityType: 'CandidateProfile',
        entityId: profile.id,
        metadata: { objectKey, photoProvider: 'upload' } as never,
      },
    });

    this.logger.log(
      JSON.stringify({ event: 'candidate_photo_confirmed', candidateId: candidate.id }),
    );

    return { ok: true, photoUrl };
  }

  /** Return the candidate's current profile photo URL */
  async getPhotoUrl(token: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { token },
      include: { profile: { select: { photoUrl: true, photoProvider: true } } },
    });
    if (!candidate) throw new NotFoundException('candidate_not_found');
    return {
      photoUrl: candidate.profile?.photoUrl ?? null,
      photoProvider: candidate.profile?.photoProvider ?? null,
    };
  }

  private sanitizeImageFilename(filename: string): string {
    const ext = filename.lastIndexOf('.') !== -1
      ? filename.slice(filename.lastIndexOf('.')).toLowerCase()
      : '.jpg';
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const safeExt = allowed.includes(ext) ? ext : '.jpg';
    return `photo${safeExt}`;
  }

  private detectImageContentType(filename: string): string {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
    return 'image/jpeg';
  }
}

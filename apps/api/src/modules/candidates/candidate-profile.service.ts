import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { StorageGateway } from '../integrations/storage.gateway.js';

@Injectable()
export class CandidateProfileService {
  private readonly logger = new Logger(CandidateProfileService.name);

  constructor(private readonly storageGateway: StorageGateway) {}

  /** Helper: resolve candidate + profile from token */
  private async resolveProfile(token: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { token },
      include: { profile: true },
    });
    if (!candidate) throw new NotFoundException('candidate_not_found');
    if (!candidate.profile) throw new NotFoundException('profile_not_found');
    return { candidate, profile: candidate.profile };
  }

  /** Get full profile with structured data */
  async getFullProfile(token: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { token },
      include: {
        profile: {
          include: {
            experiences: { orderBy: { createdAt: 'desc' as const } },
            educations: { orderBy: { createdAt: 'desc' as const } },
            skills: { orderBy: { createdAt: 'desc' as const } },
            languages: { orderBy: { createdAt: 'desc' as const } },
          },
        },
      },
    });
    if (!candidate) throw new NotFoundException('candidate_not_found');
    return {
      candidateId: candidate.id,
      profile: candidate.profile ? {
        fullName: candidate.profile.fullName,
        phone: candidate.profile.phone,
        photoUrl: candidate.profile.photoUrl,
        resumeSummary: candidate.profile.resumeSummary,
        locationCity: candidate.profile.locationCity,
        locationState: candidate.profile.locationState,
        locationCountry: candidate.profile.locationCountry,
        experiences: candidate.profile.experiences,
        educations: candidate.profile.educations,
        skills: candidate.profile.skills,
        languages: candidate.profile.languages,
      } : null,
    };
  }

  // ── Experience CRUD ───────────────────────────────────────────────────

  async addExperience(token: string, data: { company: string; role: string; period?: string; description?: string }) {
    const { profile, candidate } = await this.resolveProfile(token);
    if (!data.company || !data.role) throw new BadRequestException('company_and_role_required');
    const record = await prisma.candidateExperience.create({
      data: { profileId: profile.id, company: data.company, role: data.role, period: data.period ?? null, description: data.description ?? null, source: 'manual' },
    });
    this.logger.log(JSON.stringify({ event: 'candidate_experience_added', candidateId: candidate.id, id: record.id }));
    return record;
  }

  async updateExperience(token: string, id: string, data: { company?: string; role?: string; period?: string; description?: string }) {
    const { profile, candidate } = await this.resolveProfile(token);
    const existing = await prisma.candidateExperience.findFirst({ where: { id, profileId: profile.id } });
    if (!existing) throw new NotFoundException('experience_not_found');
    const record = await prisma.candidateExperience.update({ where: { id }, data: { ...data, source: 'manual' } });
    this.logger.log(JSON.stringify({ event: 'candidate_experience_updated', candidateId: candidate.id, id }));
    return record;
  }

  async deleteExperience(token: string, id: string) {
    const { profile, candidate } = await this.resolveProfile(token);
    const existing = await prisma.candidateExperience.findFirst({ where: { id, profileId: profile.id } });
    if (!existing) throw new NotFoundException('experience_not_found');
    await prisma.candidateExperience.delete({ where: { id } });
    this.logger.log(JSON.stringify({ event: 'candidate_experience_deleted', candidateId: candidate.id, id }));
    return { ok: true };
  }

  // ── Education CRUD ────────────────────────────────────────────────────

  async addEducation(token: string, data: { institution: string; degree: string; field?: string; period?: string }) {
    const { profile, candidate } = await this.resolveProfile(token);
    if (!data.institution || !data.degree) throw new BadRequestException('institution_and_degree_required');
    const record = await prisma.candidateEducation.create({
      data: { profileId: profile.id, institution: data.institution, degree: data.degree, field: data.field ?? null, period: data.period ?? null, source: 'manual' },
    });
    this.logger.log(JSON.stringify({ event: 'candidate_education_added', candidateId: candidate.id, id: record.id }));
    return record;
  }

  async updateEducation(token: string, id: string, data: { institution?: string; degree?: string; field?: string; period?: string }) {
    const { profile, candidate } = await this.resolveProfile(token);
    const existing = await prisma.candidateEducation.findFirst({ where: { id, profileId: profile.id } });
    if (!existing) throw new NotFoundException('education_not_found');
    const record = await prisma.candidateEducation.update({ where: { id }, data: { ...data, source: 'manual' } });
    this.logger.log(JSON.stringify({ event: 'candidate_education_updated', candidateId: candidate.id, id }));
    return record;
  }

  async deleteEducation(token: string, id: string) {
    const { profile, candidate } = await this.resolveProfile(token);
    const existing = await prisma.candidateEducation.findFirst({ where: { id, profileId: profile.id } });
    if (!existing) throw new NotFoundException('education_not_found');
    await prisma.candidateEducation.delete({ where: { id } });
    this.logger.log(JSON.stringify({ event: 'candidate_education_deleted', candidateId: candidate.id, id }));
    return { ok: true };
  }

  // ── Skills CRUD ───────────────────────────────────────────────────────

  async addSkill(token: string, data: { name: string; level?: string }) {
    const { profile, candidate } = await this.resolveProfile(token);
    if (!data.name) throw new BadRequestException('skill_name_required');
    const record = await prisma.candidateSkill.create({
      data: { profileId: profile.id, name: data.name.trim(), level: data.level ?? null, source: 'manual' },
    });
    this.logger.log(JSON.stringify({ event: 'candidate_skill_added', candidateId: candidate.id, id: record.id }));
    return record;
  }

  async deleteSkill(token: string, id: string) {
    const { profile, candidate } = await this.resolveProfile(token);
    const existing = await prisma.candidateSkill.findFirst({ where: { id, profileId: profile.id } });
    if (!existing) throw new NotFoundException('skill_not_found');
    await prisma.candidateSkill.delete({ where: { id } });
    this.logger.log(JSON.stringify({ event: 'candidate_skill_deleted', candidateId: candidate.id, id }));
    return { ok: true };
  }

  // ── Languages CRUD ────────────────────────────────────────────────────

  async addLanguage(token: string, data: { name: string; level?: string }) {
    const { profile, candidate } = await this.resolveProfile(token);
    if (!data.name) throw new BadRequestException('language_name_required');
    const record = await prisma.candidateLanguage.create({
      data: { profileId: profile.id, name: data.name.trim(), level: data.level ?? null, source: 'manual' },
    });
    this.logger.log(JSON.stringify({ event: 'candidate_language_added', candidateId: candidate.id, id: record.id }));
    return record;
  }

  async deleteLanguage(token: string, id: string) {
    const { profile, candidate } = await this.resolveProfile(token);
    const existing = await prisma.candidateLanguage.findFirst({ where: { id, profileId: profile.id } });
    if (!existing) throw new NotFoundException('language_not_found');
    await prisma.candidateLanguage.delete({ where: { id } });
    this.logger.log(JSON.stringify({ event: 'candidate_language_deleted', candidateId: candidate.id, id }));
    return { ok: true };
  }

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

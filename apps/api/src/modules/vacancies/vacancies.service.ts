import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import { AiGateway } from '../integrations/ai.gateway.js';
import { canAccessOrganization } from '../auth/organization-access.util.js';

type VacancyRecord = {
  organizationId: string;
  title: string;
  description: string;
  location: string | null;
  workModel: string | null;
  seniority: string | null;
  sector: string | null;
  experienceYearsMin: number | null;
  experienceYearsMax: number | null;
  employmentType: string | null;
  publicationType: string;
  status: string;
  publishedAt: Date | null;
  closedAt: Date | null;
  closedBy: string | null;
  filledAt: Date | null;
  guaranteeEndDate: Date | null;
  department: string | null;
  requiredSkills: unknown;
  desiredSkills: unknown;
  salaryMin: number | null;
  salaryMax: number | null;
  createdBy: string;
  [key: string]: unknown;
};

type VacancyPayload = {
  organizationId: string;
  title: string;
  description: string;
  location?: string;
  workModel?: string;
  seniority?: string;
  sector?: string;
  experienceYearsMin?: number;
  experienceYearsMax?: number;
  employmentType?: string;
  publicationType?: string;
  status?: string;
  department?: string;
  requiredSkills?: string[];
  desiredSkills?: string[];
  salaryMin?: number;
  salaryMax?: number;
  createdBy: string;
};

@Injectable()
export class VacanciesService {
  private readonly logger = new Logger(VacanciesService.name);

  constructor(@Inject(AiGateway) private readonly aiGateway: AiGateway) {}

  async create(data: VacancyPayload) {
    const canAccess = await canAccessOrganization(data.organizationId, data.createdBy);
    if (!canAccess) throw new ForbiddenException('user_not_member_of_org');
    const publicationType = data.publicationType ?? 'draft';
    const missingFields = this.getPublicationMissingFields({ ...data, publicationType });
    if (publicationType !== 'draft' && missingFields.length > 0) {
      throw new BadRequestException(`vacancy_incomplete:${missingFields.join(',')}`);
    }

    return prisma.vacancy.create({
      data: {
        ...data,
        publicationType,
        status: data.status ?? 'active',
        sector: data.sector ?? data.department,
        requiredSkills: data.requiredSkills ?? [],
        desiredSkills: data.desiredSkills ?? [],
        publishedAt: publicationType !== 'draft' ? new Date() : undefined,
      },
    });
  }

  async findAll(organizationIds: string[], role: string) {
    const rows = role === 'admin'
      ? await prisma.vacancy.findMany({ include: { organization: true } })
      : await prisma.vacancy.findMany({
          where: { organizationId: { in: organizationIds } },
          include: { organization: true },
        });

    return rows.map((vacancy) => this.enrichWithPublicationStatus(vacancy));
  }

  async findById(vacancyId: string, organizationIds: string[], role: string) {
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancyId },
      include: { organization: true },
    });
    if (!vacancy) throw new NotFoundException('vacancy_not_found');
    if (role !== 'admin' && !organizationIds.includes(vacancy.organizationId)) {
      throw new ForbiddenException('user_not_member_of_org');
    }
    return this.enrichWithPublicationStatus(vacancy);
  }

  async update(
    vacancyId: string,
    data: Partial<Omit<VacancyPayload, 'organizationId' | 'createdBy'>>,
    organizationIds: string[],
    role: string,
    actorId: string,
  ) {
    const existing = await prisma.vacancy.findUnique({ where: { id: vacancyId } });
    if (!existing) throw new NotFoundException('vacancy_not_found');
    if (role !== 'admin' && !organizationIds.includes(existing.organizationId)) {
      throw new ForbiddenException('user_not_member_of_org');
    }

    const canAccess = await canAccessOrganization(existing.organizationId, actorId);
    if (!canAccess) throw new ForbiddenException('user_not_member_of_org');

    const publicationType = data.publicationType ?? existing.publicationType;
    const merged = {
      ...existing,
      ...data,
      publicationType,
      organizationId: existing.organizationId,
      createdBy: existing.createdBy,
    };
    const missingFields = this.getPublicationMissingFields({
      organizationId: merged.organizationId,
      title: merged.title,
      description: merged.description,
      location: merged.location ?? undefined,
      workModel: merged.workModel ?? undefined,
      seniority: merged.seniority ?? undefined,
      sector: merged.sector ?? undefined,
      experienceYearsMin: merged.experienceYearsMin ?? undefined,
      experienceYearsMax: merged.experienceYearsMax ?? undefined,
      employmentType: merged.employmentType ?? undefined,
      publicationType: merged.publicationType,
      status: merged.status,
      department: merged.department ?? undefined,
      requiredSkills: Array.isArray(merged.requiredSkills) ? merged.requiredSkills.map(String) : [],
      desiredSkills: Array.isArray(merged.desiredSkills) ? merged.desiredSkills.map(String) : [],
      salaryMin: merged.salaryMin ?? undefined,
      salaryMax: merged.salaryMax ?? undefined,
      createdBy: merged.createdBy,
    });

    if (publicationType !== 'draft' && missingFields.length > 0) {
      throw new BadRequestException(`vacancy_incomplete:${missingFields.join(',')}`);
    }

    const shouldPublish = publicationType !== 'draft' && !existing.publishedAt;
    const updateData = { ...data };
    if (shouldPublish) {
      (updateData as Record<string, unknown>).publishedAt = new Date();
    }

    /* ── Lifecycle: auto-close / reopen logic ──────────────────── */
    const closingStatuses = ['disabled', 'expired'];
    const newStatus = data.status ?? existing.status;
    const wasOpen = !closingStatuses.includes(existing.status);
    const isClosed = closingStatuses.includes(newStatus);
    const wasClosedBefore = closingStatuses.includes(existing.status);
    const isReopened = wasClosedBefore && newStatus === 'active';

    if (wasOpen && isClosed && !existing.closedAt) {
      const closedAt = new Date();
      (updateData as Record<string, unknown>).closedAt = closedAt;
      (updateData as Record<string, unknown>).closedBy = actorId;
      (updateData as Record<string, unknown>).guaranteeEndDate = new Date(closedAt.getTime() + 90 * 24 * 60 * 60 * 1000);
    }

    if (isReopened) {
      (updateData as Record<string, unknown>).closedAt = null;
      (updateData as Record<string, unknown>).closedBy = null;
      (updateData as Record<string, unknown>).guaranteeEndDate = null;
      (updateData as Record<string, unknown>).filledAt = null;
    }

    const updated = await prisma.vacancy.update({
      where: { id: vacancyId },
      data: updateData,
      include: { organization: true },
    });

    const auditAction = isReopened
      ? 'vacancy.reopened'
      : (wasOpen && isClosed)
        ? 'vacancy.closed'
        : shouldPublish
          ? 'vacancy.published'
          : 'vacancy.updated';

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: auditAction,
        entityType: 'Vacancy',
        entityId: vacancyId,
        metadata: { changes: Object.keys(data), publicationType, status: newStatus } as never,
      },
    });

    return this.enrichWithPublicationStatus(updated);
  }

  private enrichWithPublicationStatus(vacancy: VacancyRecord) {
    const publicationMissingFields = this.getPublicationMissingFields({
      organizationId: vacancy.organizationId,
      title: vacancy.title,
      description: vacancy.description,
      location: vacancy.location ?? undefined,
      workModel: vacancy.workModel ?? undefined,
      seniority: vacancy.seniority ?? undefined,
      sector: vacancy.sector ?? undefined,
      experienceYearsMin: vacancy.experienceYearsMin ?? undefined,
      experienceYearsMax: vacancy.experienceYearsMax ?? undefined,
      employmentType: vacancy.employmentType ?? undefined,
      publicationType: vacancy.publicationType,
      status: vacancy.status,
      department: vacancy.department ?? undefined,
      requiredSkills: Array.isArray(vacancy.requiredSkills) ? vacancy.requiredSkills.map(String) : [],
      desiredSkills: Array.isArray(vacancy.desiredSkills) ? vacancy.desiredSkills.map(String) : [],
      salaryMin: vacancy.salaryMin ?? undefined,
      salaryMax: vacancy.salaryMax ?? undefined,
      createdBy: vacancy.createdBy,
    });

    return {
      ...vacancy,
      publicationReady: publicationMissingFields.length === 0,
      publicationMissingFields,
    };
  }

  async findPublicById(vacancyId: string) {
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancyId },
      include: {
        organization: {
          include: {
            tenantSettings: true,
          },
        },
      },
    });

    if (!vacancy) throw new NotFoundException('vacancy_not_found');

    const publicationMissingFields = this.getPublicationMissingFields({
      organizationId: vacancy.organizationId,
      title: vacancy.title,
      description: vacancy.description,
      location: vacancy.location ?? undefined,
      workModel: vacancy.workModel ?? undefined,
      seniority: vacancy.seniority ?? undefined,
      sector: vacancy.sector ?? undefined,
      experienceYearsMin: vacancy.experienceYearsMin ?? undefined,
      experienceYearsMax: vacancy.experienceYearsMax ?? undefined,
      employmentType: vacancy.employmentType ?? undefined,
      publicationType: vacancy.publicationType,
      status: vacancy.status,
      department: vacancy.department ?? undefined,
      requiredSkills: Array.isArray(vacancy.requiredSkills) ? vacancy.requiredSkills.map(String) : [],
      desiredSkills: Array.isArray(vacancy.desiredSkills) ? vacancy.desiredSkills.map(String) : [],
      salaryMin: vacancy.salaryMin ?? undefined,
      salaryMax: vacancy.salaryMax ?? undefined,
      createdBy: vacancy.createdBy,
    });

    if (vacancy.publicationType !== 'public' || vacancy.status !== 'active' || publicationMissingFields.length > 0) {
      throw new NotFoundException('vacancy_not_public');
    }

    return {
      id: vacancy.id,
      title: vacancy.title,
      description: vacancy.description,
      location: vacancy.location,
      workModel: vacancy.workModel,
      seniority: vacancy.seniority,
      sector: vacancy.sector ?? vacancy.department,
      experienceYearsMin: vacancy.experienceYearsMin,
      experienceYearsMax: vacancy.experienceYearsMax,
      employmentType: vacancy.employmentType,
      publicationType: vacancy.publicationType,
      requiredSkills: Array.isArray(vacancy.requiredSkills) ? vacancy.requiredSkills.map(String) : [],
      desiredSkills: Array.isArray(vacancy.desiredSkills) ? vacancy.desiredSkills.map(String) : [],
      salaryMin: vacancy.salaryMin,
      salaryMax: vacancy.salaryMax,
      publishedAt: vacancy.publishedAt,
      organization: {
        id: vacancy.organization.id,
        name: vacancy.organization.tenantSettings?.publicName || vacancy.organization.name,
        logoUrl: vacancy.organization.tenantSettings?.logoUrl,
        bannerUrl: vacancy.organization.tenantSettings?.bannerUrl,
        primaryColor: vacancy.organization.tenantSettings?.primaryColor,
        secondaryColor: vacancy.organization.tenantSettings?.secondaryColor,
        contactEmail: vacancy.organization.tenantSettings?.contactEmail,
      },
    };
  }

  async publicApply(vacancyId: string, email: string, fullName: string, phone?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
      throw new BadRequestException('invalid_email');
    }
    if (!fullName.trim()) {
      throw new BadRequestException('fullName_required');
    }

    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancyId },
      select: { id: true, organizationId: true, title: true, publicationType: true, status: true },
    });
    if (!vacancy) throw new NotFoundException('vacancy_not_found');
    if (vacancy.publicationType !== 'public' || vacancy.status !== 'active') {
      throw new BadRequestException('vacancy_not_available');
    }

    const phoneValue = phone?.trim() || undefined;
    const candidate = await prisma.candidate.upsert({
      where: { email: normalizedEmail },
      update: phoneValue ? { phone: phoneValue } : {},
      create: {
        email: normalizedEmail,
        phone: phoneValue,
        organizationId: vacancy.organizationId,
        token: randomUUID(),
      },
    });

    await prisma.guestSession.upsert({
      where: { token: candidate.token },
      update: { candidateId: candidate.id, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      create: { candidateId: candidate.id, token: candidate.token, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    });

    await prisma.candidateOnboardingSession.upsert({
      where: { candidateId: candidate.id },
      update: {},
      create: { candidateId: candidate.id },
    });

    await prisma.candidateProfile.upsert({
      where: { candidateId: candidate.id },
      update: { fullName: fullName.trim(), ...(phoneValue ? { phone: phoneValue } : {}) },
      create: { candidateId: candidate.id, fullName: fullName.trim(), phone: phoneValue },
    });

    await prisma.candidateOnboardingSession.update({
      where: { candidateId: candidate.id },
      data: { basicCompleted: true },
    });

    await prisma.application.upsert({
      where: { candidateId_vacancyId: { candidateId: candidate.id, vacancyId } },
      update: {},
      create: { candidateId: candidate.id, vacancyId },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: candidate.id,
        action: 'candidate.self_applied',
        entityType: 'Application',
        entityId: vacancyId,
        metadata: { vacancyId, candidateEmail: normalizedEmail, vacancyTitle: vacancy.title } as never,
      },
    });

    this.logger.log(JSON.stringify({ event: 'candidate_self_applied', vacancyId, candidateId: candidate.id }));

    return { token: candidate.token, candidateId: candidate.id, vacancyId };
  }

  async generateAssistiveContent(input: {
    title: string;
    seniority: string;
    sector: string;
    workModel?: string;
    location?: string;
  }) {
    // Agora delega para o gateway que lida com real vs mock baseado nas configs de fallback e keys da aplicação
    const result = await this.aiGateway.generateAssistiveVacancy(input);
    return result;
  }

  private getPublicationMissingFields(data: VacancyPayload) {
    const missingFields: string[] = [];
    if (!data.title?.trim()) missingFields.push('title');
    if (!data.description?.trim()) missingFields.push('description');
    if (data.publicationType === 'draft') return missingFields;

    if (!data.location?.trim()) missingFields.push('location');
    if (!data.workModel?.trim()) missingFields.push('workModel');
    if (!data.seniority?.trim()) missingFields.push('seniority');
    if (!(data.sector ?? data.department)?.trim()) missingFields.push('sector');
    if (!data.employmentType?.trim()) missingFields.push('employmentType');
    if (!data.requiredSkills?.length) missingFields.push('requiredSkills');
    if (data.experienceYearsMin != null && data.experienceYearsMax != null && data.experienceYearsMin > data.experienceYearsMax) {
      missingFields.push('experienceRange');
    }

    return missingFields;
  }
}

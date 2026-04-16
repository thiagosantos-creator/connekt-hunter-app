import { ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomBytes } from 'node:crypto';
import { ApplicationsService } from '../applications/applications.service.js';
import { CandidateInsightsService } from '../candidate-insights/candidate-insights.service.js';

const REVIEW_LINK_TTL_HOURS = 72;
const REVIEW_LINK_ORIGIN_ENV = process.env.BACKOFFICE_ORIGIN ?? 'http://localhost:5173';

@Injectable()
export class ShortlistService {
  constructor(
    @Inject(ApplicationsService) private readonly applicationsService: ApplicationsService,
    @Inject(CandidateInsightsService) private readonly insightsService: CandidateInsightsService,
  ) {}

  async addToShortlist(applicationId: string, actorId?: string) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { vacancy: true },
    });
    if (!app) throw new NotFoundException('application_not_found');

    if (actorId) {
      const membership = await prisma.membership.findUnique({
        where: { organizationId_userId: { organizationId: app.vacancy.organizationId, userId: actorId } },
      });
      if (!membership) throw new ForbiddenException('user_not_member_of_org');
    }

    const shortlist = await prisma.shortlist.upsert({
      where: { vacancyId: app.vacancyId },
      update: {},
      create: { vacancyId: app.vacancyId },
    });
    const item = await prisma.shortlistItem.upsert({
      where: { shortlistId_applicationId: { shortlistId: shortlist.id, applicationId } },
      update: {},
      create: { shortlistId: shortlist.id, applicationId },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'shortlist.added',
        entityType: 'Application',
        entityId: applicationId,
        metadata: { vacancyId: app.vacancyId, shortlistId: shortlist.id } as never,
      },
    });

    return item;
  }

  async removeFromShortlist(itemId: string, actorId?: string) {
    const item = await prisma.shortlistItem.findUnique({
      where: { id: itemId },
      include: { shortlist: { include: { vacancy: true } } },
    });
    if (!item) throw new NotFoundException('shortlist_item_not_found');

    if (actorId) {
      const membership = await prisma.membership.findUnique({
        where: { organizationId_userId: { organizationId: item.shortlist.vacancy.organizationId, userId: actorId } },
      });
      if (!membership) throw new ForbiddenException('user_not_member_of_org');
    }

    await prisma.shortlistItem.delete({ where: { id: itemId } });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'shortlist.removed',
        entityType: 'ShortlistItem',
        entityId: itemId,
        metadata: { applicationId: item.applicationId, vacancyId: item.shortlist.vacancyId } as never,
      },
    });

    return { success: true };
  }

  findShortlistedApplications(organizationIds: string[], role: string) {
    const where =
      role === 'admin'
        ? {}
        : { shortlist: { vacancy: { organizationId: { in: organizationIds } } } };
    return prisma.shortlistItem.findMany({
      where,
      include: {
        application: {
          include: {
            candidate: { include: { profile: true } },
            vacancy: {
              include: {
                organization: { include: { tenantSettings: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReviewLink(vacancyId: string, actorId: string) {
    const vacancy = await prisma.vacancy.findUnique({ where: { id: vacancyId } });
    if (!vacancy) throw new NotFoundException('vacancy_not_found');

    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: vacancy.organizationId, userId: actorId } },
    });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REVIEW_LINK_TTL_HOURS * 60 * 60 * 1000);

    await prisma.clientReviewSession.create({
      data: {
        token,
        vacancyId,
        organizationId: vacancy.organizationId,
        createdByUserId: actorId,
        expiresAt,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'shortlist.review_link_created',
        entityType: 'Vacancy',
        entityId: vacancyId,
        metadata: { vacancyId, expiresAt: expiresAt.toISOString() } as never,
      },
    });

    const url = `${REVIEW_LINK_ORIGIN_ENV}/review/${token}`;
    return { url, expiresAt: expiresAt.toISOString() };
  }

  private async verifySession(token: string) {
    const session = await prisma.clientReviewSession.findUnique({ where: { token } });
    if (!session) throw new UnauthorizedException('token_not_found');
    if (new Date(session.expiresAt) < new Date()) throw new UnauthorizedException('token_expired');
    return session;
  }

  async findPublicShortlist(token: string) {
    const session = await this.verifySession(token);

    const items = await prisma.shortlistItem.findMany({
      where: { shortlist: { vacancyId: session.vacancyId } },
      include: {
        application: {
          include: {
            candidate: { include: { profile: true } },
            vacancy: {
              include: { organization: { include: { tenantSettings: true } } },
            },
          },
        },
        decisions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: null,
        action: 'client.public_review.access',
        entityType: 'ClientReviewSession',
        entityId: session.id,
        metadata: { tokenId: session.id, vacancyId: session.vacancyId } as never,
      },
    });

    // Return only data safe for unauthenticated clients
    return items.map((item) => ({
      id: item.id,
      applicationId: item.applicationId,
      createdAt: item.createdAt,
      currentDecision: item.decisions[0]?.decision ?? null,
      candidate: {
        id: item.application.candidate.id,
        fullName: item.application.candidate.profile?.fullName ?? null,
        photoUrl: item.application.candidate.profile?.photoUrl ?? null,
      },
      vacancy: {
        id: item.application.vacancy.id,
        title: item.application.vacancy.title,
        location: item.application.vacancy.location ?? null,
        seniority: item.application.vacancy.seniority ?? null,
        requiredSkills: (item.application.vacancy.requiredSkills as string[] | null) ?? [],
        organization: {
          name: item.application.vacancy.organization?.name ?? null,
          tenantSettings: item.application.vacancy.organization?.tenantSettings
            ? {
                logoUrl: item.application.vacancy.organization.tenantSettings.logoUrl ?? null,
                primaryColor: item.application.vacancy.organization.tenantSettings.primaryColor ?? null,
                secondaryColor: item.application.vacancy.organization.tenantSettings.secondaryColor ?? null,
                publicName: item.application.vacancy.organization.tenantSettings.publicName ?? null,
              }
            : null,
        },
      },
    }));
  }

  async findPublicApplicationDetail(token: string, applicationId: string) {
    const session = await this.verifySession(token);

    // Verify application belongs to the same vacancy/org as the session
    const item = await prisma.shortlistItem.findFirst({
      where: {
        applicationId,
        shortlist: { vacancyId: session.vacancyId },
      },
    });

    if (!item) throw new ForbiddenException('application_not_in_shortlist_session');

    return this.applicationsService.findById(applicationId, [], 'admin');
  }

  async findPublicApplicationIntelligence(token: string, applicationId: string) {
    const session = await this.verifySession(token);

    const item = await prisma.shortlistItem.findFirst({
      where: {
        applicationId,
        shortlist: { vacancyId: session.vacancyId },
      },
    });

    if (!item) throw new ForbiddenException('application_not_in_shortlist_session');

    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { candidateId: true, vacancyId: true },
    });

    if (!app) throw new NotFoundException('application_not_found');

    return this.insightsService.get(app.candidateId, app.vacancyId);
  }
}

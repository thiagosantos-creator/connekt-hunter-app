import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class ApplicationsService {
  findAll(organizationIds: string[], role: string, options?: { limit?: number; offset?: number; search?: string; status?: string }) {
    const limit = Math.min(options?.limit ?? 50, 100);
    const offset = options?.offset ?? 0;

    const where: Record<string, unknown> = {};
    if (role !== 'admin') {
      where.vacancy = { organizationId: { in: organizationIds } };
    }
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.search) {
      const searchLike = `%${options.search}%`;
      where.OR = [
        { candidate: { email: { contains: options.search, mode: 'insensitive' } } },
        { candidate: { profile: { fullName: { contains: options.search, mode: 'insensitive' } } } },
        { vacancy: { title: { contains: options.search, mode: 'insensitive' } } },
      ];
    }

    return prisma.application.findMany({
      where,
      include: { candidate: true, vacancy: true },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(applicationId: string, organizationIds: string[], role: string) {
    const application = await prisma.application.findFirst({
      where:
        role === 'admin'
          ? { id: applicationId }
          : { id: applicationId, vacancy: { organizationId: { in: organizationIds } } },
      include: {
        candidate: {
          include: {
            profile: true,
            invites: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
            onboarding: {
              include: {
                consents: true,
                resumes: {
                  orderBy: { uploadedAt: 'desc' },
                  include: {
                    parseResult: true,
                    parseMetadata: true,
                  },
                },
              },
            },
          },
        },
        vacancy: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                tenantSettings: {
                  select: {
                    logoUrl: true,
                    bannerUrl: true,
                    primaryColor: true,
                    secondaryColor: true,
                    publicName: true,
                    contactEmail: true,
                  },
                },
              },
            },
          },
        },
        evaluations: {
          orderBy: { createdAt: 'desc' },
          include: {
            evaluator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        shortlistItems: {
          orderBy: { createdAt: 'desc' },
          include: {
            decisions: {
              orderBy: { createdAt: 'desc' },
              include: {
                reviewer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        smartInterviewSessions: {
          orderBy: { createdAt: 'desc' },
          include: {
            aiAnalysis: true,
            humanReview: {
              include: {
                reviewer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('application_not_found');
    }

    return application;
  }
}

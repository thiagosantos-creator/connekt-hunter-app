import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class ApplicationsService {
  findAll(organizationIds: string[], role: string) {
    if (role === 'admin') {
      return prisma.application.findMany({ include: { candidate: true, vacancy: true } });
    }
    return prisma.application.findMany({
      where: { vacancy: { organizationId: { in: organizationIds } } },
      include: {
        candidate: true,
        vacancy: true,
      },
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

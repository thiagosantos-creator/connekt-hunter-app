import { Injectable } from '@nestjs/common';
import { PrismaService } from '../integrations/prisma.service.js';

interface DashboardFilters {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  vacancyId?: string;
}

@Injectable()
export class HeadhunterDashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(filters: DashboardFilters) {
    const { organizationId, startDate, endDate, vacancyId } = filters;

    const commonWhere: any = {
      organizationId,
      ...(vacancyId && { id: vacancyId }),
    };

    const [
      publishedCount,
      closedCount,
      filledCount,
      hiresCount,
      shortlistItems,
    ] = await Promise.all([
      // 1. Published Vacancies
      this.prisma.vacancy.count({
        where: {
          ...commonWhere,
          publishedAt: { gte: startDate, lte: endDate },
        },
      }),

      // 2. Closed Vacancies
      this.prisma.vacancy.count({
        where: {
          ...commonWhere,
          status: 'closed',
          closedAt: { gte: startDate, lte: endDate },
        },
      }),

      // 3. Filled Vacancies (Jobs successfully completed)
      this.prisma.vacancy.count({
        where: {
          ...commonWhere,
          filledAt: { gte: startDate, lte: endDate },
        },
      }),

      // 4. Total Hires (Applications moved to hired)
      this.prisma.application.count({
        where: {
          vacancy: { organizationId, ...(vacancyId && { id: vacancyId }) },
          status: 'hired',
          // Assuming hired candidates have a specific update event or using a proxy
          // For now, we take applications that are currently hired
          createdAt: { lte: endDate }, 
        },
      }),

      // 5. Shortlist data for density and timing
      this.prisma.shortlistItem.findMany({
        where: {
          shortlist: {
            vacancy: {
              organizationId,
              ...(vacancyId && { id: vacancyId }),
            },
          },
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          shortlist: {
            include: {
              vacancy: true,
            },
          },
          decisions: {
            where: { decision: 'approved' },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      }),
    ]);

    // Calculate Averages
    const ttsData: number[] = []; // Time to Shortlist
    const ttaData: number[] = []; // Time to Approval
    
    // Group by vacancy to find average candidates in shortlist
    const vacancyIds = new Set(shortlistItems.map(s => s.shortlist.vacancyId));
    const avgShortlistDensity = vacancyIds.size > 0 ? shortlistItems.length / vacancyIds.size : 0;

    // Time to Shortlist Calculation (Delta between Vacancy Publication and Shortlist Item creation)
    for (const item of shortlistItems) {
      if (item.shortlist.vacancy.publishedAt) {
        const diff = item.createdAt.getTime() - item.shortlist.vacancy.publishedAt.getTime();
        ttsData.push(diff / (1000 * 60 * 60 * 24)); // Days
      }

      // Time to Approval (Delta between Shortlist creation and Client Approval)
      if (item.decisions.length > 0) {
        const diff = item.decisions[0].createdAt.getTime() - item.createdAt.getTime();
        ttaData.push(diff / (1000 * 60 * 60 * 24)); // Days
      }
    }

    const avgTimeToShortlist = ttsData.length > 0 ? ttsData.reduce((a, b) => a + b, 0) / ttsData.length : 0;
    const avgTimeToApproval = ttaData.length > 0 ? ttaData.reduce((a, b) => a + b, 0) / ttaData.length : 0;

    return {
      kpis: {
        published: publishedCount,
        closed: closedCount,
        filled: filledCount,
        hires: hiresCount,
        avgShortlist: parseFloat(avgShortlistDensity.toFixed(1)),
        tts: parseFloat(avgTimeToShortlist.toFixed(1)),
        tta: parseFloat(avgTimeToApproval.toFixed(1)),
      },
      // Trend data (simple daily breakdown for charts)
      funnel: {
        shortlisted: shortlistItems.length,
        approved: shortlistItems.filter(s => s.decisions.length > 0).length,
        hired: hiresCount,
      }
    };
  }
}

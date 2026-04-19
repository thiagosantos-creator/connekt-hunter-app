import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class BillingService {
  /**
   * Simulates creating a Stripe Checkout session for a given plan.
   * In a real implementation, this would call stripe.checkout.sessions.create.
   */
  async createCheckoutSession(organizationId: string, plan: string) {
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { tenantSettings: true },
    });

    // Mock session URL
    const mockSessionId = `sc_${Math.random().toString(36).substring(7)}`;
    const mockUrl = `https://checkout.stripe.com/pay/${mockSessionId}`;

    return {
      sessionId: mockSessionId,
      url: mockUrl,
      plan,
      organizationName: org.name,
    };
  }

  /**
   * Simulates retrieving subscription status.
   */
  async getSubscriptionStatus(organizationId: string) {
    const settings = await prisma.tenantSettings.findUnique({
      where: { organizationId },
    });

    return {
      plan: settings?.planSegment || 'standard',
      status: 'active', // Mocked as always active for MVP
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Simulates a Stripe Webhook call to sync subscription data.
   */
  async handleWebhook(payload: any) {
    // In a real app, verify signature and update DB:
    // await prisma.tenantSettings.update({
    //   where: { organizationId: payload.orgId },
    //   data: { planSegment: payload.plan }
    // });
    return { received: true };
  }
}

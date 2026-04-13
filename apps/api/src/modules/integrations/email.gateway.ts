import { Inject, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { randomUUID } from 'node:crypto';
import { IntegrationsConfigService } from './integrations-config.service.js';

@Injectable()
export class EmailGateway {
  constructor(@Inject(IntegrationsConfigService) private readonly config: IntegrationsConfigService) {}

  async sendTemplated(input: {
    tenantId: string;
    to: string;
    templateKey: string;
    templateVersion: string;
    payload: Record<string, unknown>;
    correlationId?: string;
  }) {
    const provider = this.config.isIntegrationEnabled('email') ? 'aws-ses' : 'mailhog';
    const messageId = `${provider}-${randomUUID()}`;

    const dispatch = await prisma.messageDispatch.create({
      data: {
        channel: provider,
        destination: input.to,
        content: JSON.stringify({ templateKey: input.templateKey, templateVersion: input.templateVersion }),
        status: 'sent',
      },
    });

    await prisma.messageEvent.createMany({
      data: [
        {
          dispatchId: dispatch.id,
          provider,
          eventType: 'accepted',
          providerMessageId: messageId,
          metadata: { correlationId: input.correlationId ?? dispatch.id } as never,
        },
      ],
    });

    return { dispatchId: dispatch.id, provider, messageId };
  }

  async ingestWebhook(input: { provider: string; eventType: string; providerMessageId: string; payload: Record<string, unknown> }) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        provider: input.provider,
        eventType: input.eventType,
        status: 'processed',
        payload: input.payload as never,
      },
    });

    await prisma.messageEvent.create({
      data: {
        dispatchId: (input.payload.dispatchId as string | undefined) ?? 'unknown',
        provider: input.provider,
        eventType: input.eventType,
        providerMessageId: input.providerMessageId,
        metadata: input.payload as never,
      },
    }).catch(() => undefined);

    return delivery;
  }
}

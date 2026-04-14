import { Inject, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { randomUUID } from 'node:crypto';
import { IntegrationsConfigService } from './integrations-config.service.js';

@Injectable()
export class SmsGateway {
  private readonly region = process.env.SNS_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
  private readonly sns = new SNSClient({ region: this.region });

  constructor(@Inject(IntegrationsConfigService) private readonly config: IntegrationsConfigService) {}

  async sendTemplated(input: {
    tenantId: string;
    to: string;
    templateKey: string;
    templateVersion: string;
    payload: Record<string, unknown>;
    correlationId?: string;
  }) {
    const provider = this.config.isIntegrationEnabled('phone') ? 'aws-sns' : 'sms-mock';
    const phoneNumber = this.normalizePhone(input.to);
    const message = this.renderTemplate(input.templateKey, input.payload);

    const dispatch = await prisma.messageDispatch.create({
      data: {
        channel: provider,
        destination: phoneNumber,
        content: JSON.stringify({
          templateKey: input.templateKey,
          templateVersion: input.templateVersion,
          payload: input.payload,
        }),
        status: 'queued',
      },
    });

    try {
      const providerMessageId = provider === 'aws-sns'
        ? await this.sendWithSns(phoneNumber, message)
        : `${provider}-${randomUUID()}`;

      await prisma.messageDispatch.update({
        where: { id: dispatch.id },
        data: { status: 'sent' },
      });

      await prisma.messageEvent.create({
        data: {
          dispatchId: dispatch.id,
          provider,
          eventType: 'accepted',
          providerMessageId,
          metadata: {
            correlationId: input.correlationId ?? dispatch.id,
            templateKey: input.templateKey,
          } as never,
        },
      });

      return { dispatchId: dispatch.id, provider, messageId: providerMessageId };
    } catch (error) {
      await prisma.messageDispatch.update({
        where: { id: dispatch.id },
        data: { status: 'failed' },
      });

      await prisma.messageEvent.create({
        data: {
          dispatchId: dispatch.id,
          provider,
          eventType: 'failed',
          providerMessageId: `${provider}-failed-${dispatch.id}`,
          metadata: {
            correlationId: input.correlationId ?? dispatch.id,
            error: String(error),
            templateKey: input.templateKey,
          } as never,
        },
      });

      throw error;
    }
  }

  private async sendWithSns(phoneNumber: string, message: string) {
    const senderId = process.env.SNS_SENDER_ID;
    const smsType = process.env.SNS_SMS_TYPE ?? 'Transactional';
    const response = await this.sns.send(new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: smsType,
        },
        ...(senderId ? {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: senderId,
          },
        } : {}),
      },
    }));

    if (!response.MessageId) {
      throw new Error('aws_sns_missing_message_id');
    }

    return response.MessageId;
  }

  private renderTemplate(templateKey: string, payload: Record<string, unknown>) {
    const accessUrl = this.toStringValue(payload.accessUrl);
    const stepKey = this.toStringValue(payload.stepKey);
    const vacancyTitle = this.toStringValue(payload.vacancyTitle) || 'oportunidade';
    const eventKey = this.toStringValue(payload.eventKey) || templateKey;

    switch (templateKey) {
      case 'candidate-invite':
        return `Connekt Hunter: convite para ${vacancyTitle}. Acesse ${accessUrl}`;
      case 'invite-followup':
        return `Connekt Hunter: lembrete ${stepKey || 'de candidatura'}. Continue sua candidatura em ${accessUrl}`;
      default:
        return `Connekt Hunter: notificacao ${eventKey}. ${accessUrl ? `Detalhes: ${accessUrl}` : ''}`.trim();
    }
  }

  private normalizePhone(phone: string) {
    const normalized = phone.replace(/[^\d+]/g, '');
    if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) {
      throw new Error('invalid_phone_destination');
    }
    return normalized.startsWith('+') ? normalized : `+${normalized}`;
  }

  private toStringValue(value: unknown) {
    return typeof value === 'string' ? value : '';
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { randomUUID } from 'node:crypto';
import { IntegrationsConfigService } from './integrations-config.service.js';

@Injectable()
export class EmailGateway {
  private readonly region = process.env.SES_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
  private readonly fromEmail = process.env.SES_FROM_EMAIL ?? '';
  private readonly ses = new SESv2Client({ region: this.region });

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
    const dispatch = await prisma.messageDispatch.create({
      data: {
        channel: provider,
        destination: input.to,
        content: JSON.stringify({
          templateKey: input.templateKey,
          templateVersion: input.templateVersion,
          payload: input.payload,
        }),
        status: 'queued',
      },
    });

    try {
      const providerMessageId = provider === 'aws-ses'
        ? await this.sendWithSes(input.to, input.templateKey, input.payload)
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

  private async sendWithSes(to: string, templateKey: string, payload: Record<string, unknown>) {
    if (!this.fromEmail) {
      throw new Error('SES_FROM_EMAIL is required when FF_EMAIL_REAL=true');
    }

    const rendered = this.renderTemplate(templateKey, payload);
    const response = await this.ses.send(new SendEmailCommand({
      FromEmailAddress: this.fromEmail,
      Destination: {
        ToAddresses: [to],
      },
      Content: {
        Simple: {
          Subject: {
            Charset: 'UTF-8',
            Data: rendered.subject,
          },
          Body: {
            Text: {
              Charset: 'UTF-8',
              Data: rendered.text,
            },
            Html: {
              Charset: 'UTF-8',
              Data: rendered.html,
            },
          },
        },
      },
    }));

    if (!response.MessageId) {
      throw new Error('aws_ses_missing_message_id');
    }

    return response.MessageId;
  }

  private renderTemplate(templateKey: string, payload: Record<string, unknown>) {
    const accessUrl = this.toStringValue(payload.accessUrl);
    const resetUrl = this.toStringValue(payload.resetUrl);
    const vacancyTitle = this.toStringValue(payload.vacancyTitle) || 'oportunidade';
    const eventSummary = JSON.stringify(payload, null, 2);

    switch (templateKey) {
      case 'candidate-invite':
        return {
          subject: `Convite para candidatura: ${vacancyTitle}`,
          text: `Você recebeu um convite para a vaga ${vacancyTitle}.\n\nAcesse o link: ${accessUrl}`,
          html: `<p>Você recebeu um convite para a vaga <strong>${this.escapeHtml(vacancyTitle)}</strong>.</p><p><a href="${this.escapeHtml(accessUrl)}">Acessar candidatura</a></p>`,
        };
      case 'candidate-password-reset':
        return {
          subject: 'Redefinição de acesso',
          text: `Use este link para redefinir o acesso: ${resetUrl}`,
          html: `<p>Use este link para redefinir o acesso:</p><p><a href="${this.escapeHtml(resetUrl)}">Redefinir acesso</a></p>`,
        };
      case 'candidate-feedback': {
        const candidateName = this.toStringValue(payload.candidateName) || 'Candidato';
        const feedbackMessage = this.toStringValue(payload.feedbackMessage);
        const senderName = this.toStringValue(payload.senderName) || 'Equipe Connekt Hunter';
        return {
          subject: `Feedback sobre sua candidatura: ${vacancyTitle}`,
          text: `Olá ${candidateName},\n\nSegue o feedback sobre sua candidatura para a vaga ${vacancyTitle}:\n\n${feedbackMessage}\n\nAtenciosamente,\n${senderName}`,
          html: `<p>Olá <strong>${this.escapeHtml(candidateName)}</strong>,</p><p>Segue o feedback sobre sua candidatura para a vaga <strong>${this.escapeHtml(vacancyTitle)}</strong>:</p><div style="padding:16px;border-left:4px solid #4A90D9;margin:16px 0;background:#f8f9fa">${this.escapeHtml(feedbackMessage)}</div><p>Atenciosamente,<br/><strong>${this.escapeHtml(senderName)}</strong></p>`,
        };
      }
      default:
        return {
          subject: `Notificação Connekt Hunter: ${templateKey}`,
          text: `Evento ${templateKey}\n\n${eventSummary}`,
          html: `<p>Evento <strong>${this.escapeHtml(templateKey)}</strong></p><pre>${this.escapeHtml(eventSummary)}</pre>`,
        };
    }
  }

  private toStringValue(value: unknown) {
    return typeof value === 'string' ? value : '';
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

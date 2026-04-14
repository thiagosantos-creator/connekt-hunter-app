import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sesSendMock } = vi.hoisted(() => ({
  sesSendMock: vi.fn(),
}));

vi.mock('@connekt/db', () => ({
  prisma: {
    messageDispatch: {
      create: vi.fn().mockResolvedValue({ id: 'dispatch-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    messageEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    webhookDelivery: {
      create: vi.fn().mockResolvedValue({ id: 'webhook-1' }),
    },
  },
}));

vi.mock('@aws-sdk/client-sesv2', () => {
  class SESv2Client {
    send = sesSendMock;
  }
  class SendEmailCommand {
    constructor(readonly input: unknown) {}
  }
  return { SESv2Client, SendEmailCommand };
});

import { prisma } from '@connekt/db';
import { EmailGateway } from './email.gateway.js';

describe('EmailGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SES_FROM_EMAIL', 'no-reply@test.local');
    sesSendMock.mockResolvedValue({ MessageId: 'ses-message-1' });
  });

  it('sends candidate invite through SES when email integration is enabled', async () => {
    const service = new EmailGateway({
      isIntegrationEnabled: (key: string) => key === 'email',
    } as never);

    const result = await service.sendTemplated({
      tenantId: 'org-1',
      to: 'candidate@test.local',
      templateKey: 'candidate-invite',
      templateVersion: 'v1',
      payload: {
        accessUrl: 'http://localhost:5174/?token=abc',
        vacancyTitle: 'Software Engineer',
      },
    });

    expect(result).toEqual({
      dispatchId: 'dispatch-1',
      provider: 'aws-ses',
      messageId: 'ses-message-1',
    });
    expect(prisma.messageDispatch.update).toHaveBeenCalledWith({
      where: { id: 'dispatch-1' },
      data: { status: 'sent' },
    });
  });

  it('uses local mailhog mode when the real email integration flag is disabled', async () => {
    const service = new EmailGateway({
      isIntegrationEnabled: () => false,
    } as never);

    const result = await service.sendTemplated({
      tenantId: 'org-1',
      to: 'candidate@test.local',
      templateKey: 'candidate-invite',
      templateVersion: 'v1',
      payload: { accessUrl: 'http://localhost:5174/?token=abc' },
    });

    expect(result.provider).toBe('mailhog');
    expect(sesSendMock).not.toHaveBeenCalled();
  });
});

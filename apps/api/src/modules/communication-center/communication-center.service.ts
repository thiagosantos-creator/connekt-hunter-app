import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class CommunicationCenterService {
  async listTemplates(organizationId: string, actorId: string, role: string) {
    await this.assertAccess(organizationId, actorId, role);
    return prisma.communicationTemplate.findMany({ where: { organizationId }, include: { versions: { orderBy: { version: 'desc' } } } });
  }

  async createTemplate(
    organizationId: string,
    actorId: string,
    role: string,
    payload: { name: string; type: string; channel: string; placeholders: string[]; content: string },
  ) {
    await this.assertAccess(organizationId, actorId, role);

    const template = await prisma.communicationTemplate.create({
      data: {
        organizationId,
        name: payload.name,
        type: payload.type,
        channel: payload.channel,
        placeholders: payload.placeholders,
        createdBy: actorId,
      },
    });

    await prisma.communicationTemplateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        status: 'draft',
        content: payload.content,
        createdBy: actorId,
      },
    });

    return template;
  }

  async publishTemplateVersion(organizationId: string, actorId: string, role: string, templateId: string) {
    await this.assertAccess(organizationId, actorId, role);
    const template = await prisma.communicationTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.organizationId !== organizationId) throw new NotFoundException('template_not_found');

    const draft = await prisma.communicationTemplateVersion.findFirst({ where: { templateId, status: 'draft' }, orderBy: { version: 'desc' } });
    if (!draft) throw new NotFoundException('draft_version_not_found');

    await prisma.communicationTemplateVersion.updateMany({ where: { templateId, status: 'published' }, data: { status: 'archived' } });
    const published = await prisma.communicationTemplateVersion.update({ where: { id: draft.id }, data: { status: 'published' } });

    await prisma.auditEvent.create({
      data: {
        actorId,
        action: 'communication-template.published',
        entityType: 'communication-template',
        entityId: templateId,
        metadata: { organizationId, version: published.version } as never,
      },
    });

    return published;
  }

  async dispatchTemplate(
    organizationId: string,
    actorId: string,
    role: string,
    payload: { templateId: string; recipient: string; eventKey: string; idempotencyKey: string; variables?: Record<string, string> },
  ) {
    await this.assertAccess(organizationId, actorId, role);

    const existing = await prisma.communicationDispatchAudit.findUnique({ where: { idempotencyKey: payload.idempotencyKey } });
    if (existing) return existing;

    const published = await prisma.communicationTemplateVersion.findFirst({ where: { templateId: payload.templateId, status: 'published' }, orderBy: { version: 'desc' } });
    if (!published) throw new NotFoundException('published_template_not_found');

    let renderedContent = published.content;
    if (payload.variables) {
      for (const [key, value] of Object.entries(payload.variables)) {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        renderedContent = renderedContent.replace(new RegExp(`\\{${escaped}\\}`, 'g'), value);
      }
    }

    return prisma.communicationDispatchAudit.create({
      data: {
        organizationId,
        templateId: payload.templateId,
        templateVersionId: published.id,
        recipient: payload.recipient,
        eventKey: payload.eventKey,
        channel: 'email',
        status: 'queued',
        idempotencyKey: payload.idempotencyKey,
        requestedBy: actorId,
        renderedContent,
      },
    });
  }

  async dispatchAudit(organizationId: string, actorId: string, role: string) {
    await this.assertAccess(organizationId, actorId, role);
    return prisma.communicationDispatchAudit.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  private async assertAccess(organizationId: string, actorId: string, role: string) {
    if (role === 'admin') return;
    const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: actorId } } });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }
}

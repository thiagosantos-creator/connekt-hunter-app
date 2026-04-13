import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class VacancyTemplatesService {
  async create(actorId: string, payload: {
    organizationId: string;
    name: string;
    sector: string;
    role: string;
    status?: 'draft' | 'active' | 'archived';
    isFavorite?: boolean;
    defaultFields: Record<string, unknown>;
  }) {
    await this.assertMembership(payload.organizationId, actorId);
    const template = await prisma.vacancyTemplate.create({
      data: {
        ...payload,
        status: payload.status ?? 'draft',
        isFavorite: payload.isFavorite ?? false,
        createdBy: actorId,
        defaultFields: payload.defaultFields as never,
      },
    });

    await prisma.vacancyTemplateVersion.create({
      data: {
        templateId: template.id,
        version: template.version,
        status: template.status,
        fields: template.defaultFields as never,
        createdBy: actorId,
      },
    });

    await prisma.auditEvent.create({
      data: {
        action: 'vacancy-template.created',
        actorId,
        entityType: 'vacancy-template',
        entityId: template.id,
        metadata: { organizationId: payload.organizationId, status: template.status },
      },
    });

    return template;
  }

  async listForUser(actorId: string, role: string, organizationIds: string[]) {
    const orgFilter = role === 'admin' ? {} : { organizationId: { in: organizationIds } };
    if (role !== 'admin' && organizationIds.length === 0) {
      throw new ForbiddenException('user_without_organization');
    }
    return prisma.vacancyTemplate.findMany({ where: orgFilter, orderBy: [{ isFavorite: 'desc' }, { usageCount: 'desc' }, { updatedAt: 'desc' }] });
  }

  async update(actorId: string, id: string, payload: Partial<{
    name: string;
    sector: string;
    role: string;
    status: 'draft' | 'active' | 'archived';
    isFavorite: boolean;
    defaultFields: Record<string, unknown>;
  }>) {
    const existing = await prisma.vacancyTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('template_not_found');
    await this.assertMembership(existing.organizationId, actorId);

    const nextVersion = existing.version + ((payload.defaultFields || payload.status) ? 1 : 0);
    const updated = await prisma.vacancyTemplate.update({
      where: { id },
      data: {
        ...payload,
        defaultFields: payload.defaultFields as never,
        version: nextVersion,
      },
    });

    if (nextVersion !== existing.version) {
      await prisma.vacancyTemplateVersion.create({
        data: {
          templateId: id,
          version: nextVersion,
          status: updated.status,
          fields: updated.defaultFields as never,
          createdBy: actorId,
        },
      });
    }

    await prisma.auditEvent.create({
      data: {
        action: payload.status === 'archived' ? 'vacancy-template.archived' : 'vacancy-template.updated',
        actorId,
        entityType: 'vacancy-template',
        entityId: updated.id,
        metadata: payload as never,
      },
    });

    return updated;
  }

  async applyTemplate(actorId: string, templateId: string) {
    const template = await prisma.vacancyTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('template_not_found');
    await this.assertMembership(template.organizationId, actorId);

    await prisma.vacancyTemplate.update({ where: { id: templateId }, data: { usageCount: { increment: 1 } } });
    return template.defaultFields;
  }

  private async assertMembership(organizationId: string, actorId: string) {
    const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: actorId } } });
    if (!membership) throw new ForbiddenException('user_not_member_of_org');
  }
}

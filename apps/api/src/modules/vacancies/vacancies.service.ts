import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class VacanciesService {
  async create(data: {
    organizationId: string;
    title: string;
    description: string;
    location?: string;
    workModel?: string;
    seniority?: string;
    employmentType?: string;
    publicationType?: string;
    status?: string;
    department?: string;
    requiredSkills?: string[];
    desiredSkills?: string[];
    salaryMin?: number;
    salaryMax?: number;
    createdBy: string;
  }) {
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: data.organizationId, userId: data.createdBy } },
    });

    if (!membership) throw new ForbiddenException('user_not_member_of_org');
    return prisma.vacancy.create({
      data: {
        ...data,
        publicationType: data.publicationType ?? 'draft',
        status: data.status ?? 'active',
        requiredSkills: data.requiredSkills ?? [],
        desiredSkills: data.desiredSkills ?? [],
      },
    });
  }

  findAll(organizationIds: string[], role: string) {
    if (role === 'admin') {
      return prisma.vacancy.findMany({ include: { organization: true } });
    }
    return prisma.vacancy.findMany({
      where: { organizationId: { in: organizationIds } },
      include: { organization: true },
    });
  }

  generateAssistiveContent(input: {
    title: string;
    seniority: string;
    sector: string;
    workModel?: string;
    location?: string;
  }) {
    const seniorityLabel = input.seniority || 'pleno';
    const locationLabel = input.location || 'a combinar';
    const workModelLabel = input.workModel || 'híbrido';
    const summary = `Buscamos ${input.title} (${seniorityLabel}) para atuar no setor ${input.sector}, em modelo ${workModelLabel}, com base em ${locationLabel}. Conteúdo gerado por IA (requer revisão humana).`;
    return {
      summary,
      responsibilities: [
        `Liderar entregas de ${input.title} com foco em qualidade e previsibilidade.`,
        'Colaborar com stakeholders de negócio e pares técnicos para priorização.',
        'Garantir documentação de decisões e melhoria contínua do fluxo.',
      ],
      requiredSkills: [
        `${seniorityLabel} experiência prática na função`,
        `Conhecimento sólido no domínio de ${input.sector}`,
        'Comunicação clara e orientação a métricas de entrega',
      ],
      desiredSkills: [
        'Experiência com ambientes multi-tenant e trilha de auditoria',
        'Familiaridade com automações assíncronas e operações orientadas a SLA',
      ],
      keywords: [input.title, input.sector, seniorityLabel, workModelLabel, locationLabel],
      generatedByAI: true,
      requiresHumanReview: true,
      provider: 'mock-assistive-v1',
      generatedAt: new Date().toISOString(),
    };
  }
}

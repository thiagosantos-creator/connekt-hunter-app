import { Controller, Get } from '@nestjs/common';
import { prisma } from '@connekt/db';
import { IntegrationsHealthService } from '../integrations/integrations-health.service.js';

@Controller()
export class HealthController {
  constructor(private readonly integrationsHealth: IntegrationsHealthService) {}

  @Get('/health')
  async health() {
    await prisma.$queryRaw`SELECT 1`;
    const integrations = await this.integrationsHealth.health();
    return { status: 'ok', service: 'api', ...integrations };
  }
}

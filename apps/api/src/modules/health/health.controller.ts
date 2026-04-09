import { Controller, Get } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Controller()
export class HealthController {
  @Get('/health')
  async health() {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', service: 'api' };
  }
}

import { Injectable } from '@nestjs/common';
import { prisma } from '@connekt/db';

@Injectable()
export class ApplicationsService {
  findAll() {
    return prisma.application.findMany({ include: { candidate: true, vacancy: true } });
  }
}

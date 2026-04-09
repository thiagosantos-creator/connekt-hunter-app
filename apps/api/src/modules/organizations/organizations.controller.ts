import { Body, Controller, Get, Post } from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(@Body() body: { name: string; createdBy: string }) {
    return this.organizationsService.create(body);
  }

  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }
}

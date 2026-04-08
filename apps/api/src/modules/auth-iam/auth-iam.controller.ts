import { Controller, Get } from '@nestjs/common';

import { AuthIamService } from './auth-iam.service';

@Controller('auth-iam')
export class AuthIamController {
  constructor(private readonly service: AuthIamService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }
}

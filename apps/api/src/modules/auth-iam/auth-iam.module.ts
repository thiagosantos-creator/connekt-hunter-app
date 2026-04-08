import { Module } from '@nestjs/common';

import { AuthIamController } from './auth-iam.controller';
import { AuthIamService } from './auth-iam.service';

@Module({
  controllers: [AuthIamController],
  providers: [AuthIamService],
  exports: [AuthIamService],
})
export class AuthIamModule {}

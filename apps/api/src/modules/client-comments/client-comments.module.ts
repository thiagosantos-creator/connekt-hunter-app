import { Module } from '@nestjs/common';
import { ClientCommentsController } from './client-comments.controller.js';
import { ClientCommentsService } from './client-comments.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ClientCommentsController],
  providers: [ClientCommentsService],
})
export class ClientCommentsModule {}
